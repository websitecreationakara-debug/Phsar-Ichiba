import { createServerFn } from "@tanstack/react-start";
import { count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, products, product_variations, promotions, promo_codes } from "@/db/schema";
import { applyPromo } from "@/lib/promotions";
import { promoCodeDiscount } from "@/lib/promo-code";
import { notifyNewOrder, notifyOrderShipped } from "@/lib/notify";
import {
  getSessionUser,
  requireAdmin,
  requireOrderViewer,
  requireStaff,
  requireUser,
} from "./_auth";

type OrderItem = { id: string; title: string; qty: number; price: number };

// Order line ids are either a simple product id or a product_variation id.
type CreateOrderInput = {
  items: { id: string; title: string; qty: number }[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  location_lat?: number | null;
  location_lng?: number | null;
  promo_code?: string | null;
  scheduled_at?: string | null;
  payment_method?: string | null;
  fulfillment_method?: string | null;
};

// Flat delivery fee charged on every order — this business has no free-delivery tier.
const SHIPPING_FEE = 1.5;

const parseItems = (row: typeof orders.$inferSelect) => ({
  ...row,
  items: JSON.parse(row.items || "[]") as OrderItem[],
});

// Alert the store (Telegram + email) that a confirmed order is ready to fulfil.
// Called immediately for COD, but deferred to the payment-confirmed path for
// KHQR so the store is never pinged for an order that was never paid.
async function notifyOrderPlaced(row: typeof orders.$inferSelect, items: OrderItem[]) {
  await notifyNewOrder({
    id: row.id,
    total: row.total,
    items,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    address: row.address,
    city: row.city,
    postal_code: row.postal_code,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    scheduled_at: row.scheduled_at,
    fulfillment_method: row.fulfillment_method,
  });
}

// Flip a KHQR order to paid and notify the store. Idempotent — a duplicate
// webhook (or the mock confirm firing twice) is a no-op. Server-only; called
// from the payment callback (src/start.ts) and the mock confirm (src/data/payments.ts).
export async function markOrderPaid(orderId: string, ref?: string | null) {
  const db = getDb();
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!row) throw new Error("Order not found");
  if (row.payment_status === "paid") return { ok: true, alreadyPaid: true };

  await db
    .update(orders)
    .set({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: ref ?? row.payment_ref,
      // Awaiting-payment orders join the normal queue once paid.
      status: row.status === "awaiting_payment" ? "pending" : row.status,
    })
    .where(eq(orders.id, orderId));

  await notifyOrderPlaced(row, JSON.parse(row.items || "[]") as OrderItem[]);
  return { ok: true, alreadyPaid: false };
}

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireOrderViewer();
  const rows = await getDb().select().from(orders).orderBy(desc(orders.created_at));
  return rows.map(parseItems);
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: CreateOrderInput) => d)
  .handler(async ({ data }) => {
    // Guest checkout: a session is optional. Logged-in orders are stamped with
    // the user id; guest orders carry null and rely on the typed contact fields.
    const user = await getSessionUser();
    const db = getDb();

    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) throw new Error("Your cart is empty");

    // SECURITY: never trust client-sent prices or totals. Re-price every line
    // from the DB (matching either a simple product or a variation id) and
    // recompute the total + shipping server-side.
    const ids = rawItems.map((i) => i.id).filter(Boolean);
    const [prodRows, varRows] = await Promise.all([
      db
        .select({
          id: products.id,
          price: products.price,
          sale_price: products.sale_price,
          stock: products.stock,
          promotion_id: products.promotion_id,
        })
        .from(products)
        .where(inArray(products.id, ids)),
      db
        .select({
          id: product_variations.id,
          price: product_variations.price,
          sale_price: product_variations.sale_price,
          stock: product_variations.stock,
          product_id: product_variations.product_id,
        })
        .from(product_variations)
        .where(inArray(product_variations.id, ids)),
    ]);

    // A variation's discount comes from its parent product's promotion, so fetch
    // those parents, then load every referenced promotion once.
    const parentIds = [...new Set(varRows.map((v) => v.product_id))];
    const parents = parentIds.length
      ? await db
          .select({ id: products.id, promotion_id: products.promotion_id })
          .from(products)
          .where(inArray(products.id, parentIds))
      : [];
    const promoIdByParent = new Map(parents.map((p) => [p.id, p.promotion_id]));
    const promoIds = [
      ...new Set(
        [...prodRows.map((p) => p.promotion_id), ...parents.map((p) => p.promotion_id)].filter(
          (id): id is string => !!id,
        ),
      ),
    ];
    const promoRows = promoIds.length
      ? await db.select().from(promotions).where(inArray(promotions.id, promoIds))
      : [];
    const promoById = new Map(promoRows.map((p) => [p.id, p]));
    const now = Date.now();

    // SECURITY: re-price from the DB and apply any live promotion discount here
    // — the server is the single source of truth for what the customer is
    // charged, regardless of what the client showed. applyPromo never raises the
    // price (an expired offer simply falls back to sale_price/price).
    const priceById = new Map<string, number>();
    for (const p of prodRows) {
      const promo = p.promotion_id ? promoById.get(p.promotion_id) : undefined;
      priceById.set(p.id, applyPromo(p.sale_price ?? p.price, promo, now));
    }
    for (const v of varRows) {
      const pid = promoIdByParent.get(v.product_id);
      const promo = pid ? promoById.get(pid) : undefined;
      priceById.set(v.id, applyPromo(v.sale_price ?? v.price, promo, now));
    }

    const items: OrderItem[] = rawItems.map((i) => {
      const price = priceById.get(i.id);
      if (price == null) throw new Error("One or more items are no longer available");
      const qty = Math.floor(Number(i.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > 999) throw new Error("Invalid quantity");
      return { id: i.id, title: String(i.title ?? "").slice(0, 200), qty, price };
    });

    // Inventory guard. null stock = untracked (always available); a number is a
    // tracked count. Block the order if any tracked line is short — checked
    // against the summed quantity per id, before anything is written.
    const stockById = new Map<string, number | null>();
    for (const p of prodRows) stockById.set(p.id, p.stock);
    for (const v of varRows) stockById.set(v.id, v.stock);
    const neededById = new Map<string, number>();
    for (const i of items) neededById.set(i.id, (neededById.get(i.id) ?? 0) + i.qty);
    for (const [id, need] of neededById) {
      const stock = stockById.get(id);
      if (stock != null && need > stock) {
        const title = items.find((i) => i.id === id)?.title ?? "An item";
        throw new Error(
          stock <= 0 ? `${title} is out of stock.` : `Only ${stock} of "${title}" left in stock.`,
        );
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    // Apply a promo code if one was entered and is still active. Recomputed
    // server-side from the DB — the client's quoted discount is never trusted.
    let discount = 0;
    let appliedCode: string | null = null;
    const codeInput = data.promo_code?.trim().toUpperCase();
    if (codeInput) {
      const [pc] = await db.select().from(promo_codes).where(eq(promo_codes.code, codeInput));
      if (pc && pc.active) {
        discount = promoCodeDiscount(pc.type, pc.value, subtotal);
        if (discount > 0) appliedCode = pc.code;
      }
    }
    const discountedSubtotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    // Store pickup is always free — the flat fee only applies to delivery.
    const fulfillment = data.fulfillment_method === "pickup" ? "pickup" : "delivery";
    const shipping = fulfillment === "pickup" || discountedSubtotal === 0 ? 0 : SHIPPING_FEE;
    const total = Math.round((discountedSubtotal + shipping) * 100) / 100;

    // KHQR orders wait in "awaiting_payment" until the gateway confirms; COD
    // orders go straight into the fulfilment queue as "pending".
    const method = data.payment_method === "khqr" ? "khqr" : "cod";

    const [row] = await db
      .insert(orders)
      .values({
        user_id: user?.id ?? null,
        total,
        discount,
        promo_code: appliedCode,
        status: method === "khqr" ? "awaiting_payment" : "pending",
        payment_method: method,
        payment_status: "unpaid",
        items: JSON.stringify(items),
        customer_name: data.customer_name?.trim() || user?.name || null,
        customer_email: data.customer_email?.trim() || user?.email || null,
        customer_phone: data.customer_phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        location_lat: data.location_lat ?? null,
        location_lng: data.location_lng ?? null,
        scheduled_at: data.scheduled_at?.trim() || null,
        fulfillment_method: fulfillment,
      })
      .returning();

    // Deduct tracked inventory now that the order is committed. Untracked
    // (null) lines are skipped; counts are clamped at 0 as a belt-and-braces
    // guard even though the check above already prevents oversell.
    const productIdSet = new Set(prodRows.map((p) => p.id));
    await Promise.all(
      [...neededById].map(([id, need]) => {
        const stock = stockById.get(id);
        if (stock == null) return null;
        const next = Math.max(0, stock - need);
        return productIdSet.has(id)
          ? db.update(products).set({ stock: next }).where(eq(products.id, id))
          : db.update(product_variations).set({ stock: next }).where(eq(product_variations.id, id));
      }),
    );

    // COD: notify the store now. KHQR: hold the notification until payment is
    // confirmed (markOrderPaid), so an unpaid online order never alerts the store.
    if (method === "cod") await notifyOrderPlaced(row, items);

    return { ok: true, id: row.id, total, payment_method: method };
  });

export const listMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.user_id, user.id))
    .orderBy(desc(orders.created_at));
  return rows.map(parseItems);
});

export const countPendingOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const [r] = await getDb().select({ n: count() }).from(orders).where(eq(orders.status, "pending"));
  return r?.n ?? 0;
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data }) => {
    await requireStaff();
    const db = getDb();
    const [before] = await db.select().from(orders).where(eq(orders.id, data.id));
    if (!before) throw new Error("Order not found");
    await db.update(orders).set({ status: data.status }).where(eq(orders.id, data.id));

    // Notify on the transition into "shipped" — but only if a tracking link is
    // already set. Normally the link is added after shipping (the admin input
    // only appears once shipped), so the email is sent from updateOrderTracking
    // instead. This branch covers the rare case the link was set beforehand.
    if (data.status === "shipped" && before.status !== "shipped" && before.tracking_url) {
      await notifyOrderShipped({
        id: before.id,
        items: JSON.parse(before.items || "[]") as OrderItem[],
        total: before.total,
        customer_name: before.customer_name,
        customer_email: before.customer_email,
        tracking_url: before.tracking_url,
      });
    }
    return { ok: true };
  });

export const updateOrderTracking = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; tracking_url: string }) => d)
  .handler(async ({ data }) => {
    await requireStaff();
    const db = getDb();
    const [before] = await db.select().from(orders).where(eq(orders.id, data.id));
    if (!before) throw new Error("Order not found");
    const url = data.tracking_url.trim() || null;
    await db.update(orders).set({ tracking_url: url }).where(eq(orders.id, data.id));

    // First time a link is added to an already-shipped order → notify the
    // customer with the track button. Editing an existing link won't re-send.
    if (url && before.status === "shipped" && !before.tracking_url) {
      await notifyOrderShipped({
        id: before.id,
        items: JSON.parse(before.items || "[]") as OrderItem[],
        total: before.total,
        customer_name: before.customer_name,
        customer_email: before.customer_email,
        tracking_url: url,
      });
    }
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb().delete(orders).where(eq(orders.id, data.id));
    return { ok: true };
  });

// Server-only: on a new order, alerts the store admin (Telegram + email) and
// emails the customer a confirmation. Reuses the same Resend setup as auth
// emails. Never throws — a failed notification must not fail the order itself.
import { Resend } from "resend";

type OrderItem = { id: string; title: string; qty: number; price: number; title_en?: string | null };

// Staff-facing alerts (Telegram, admin email) show the English name when one is
// set; customer-facing emails always show the storefront title.
const itemLabel = (i: OrderItem, forStaff: boolean): string =>
  (forStaff && i.title_en) || i.title;

export type OrderNotification = {
  id: string;
  total: number;
  items: OrderItem[];
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_number?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  scheduled_at?: string | null;
  fulfillment_method?: string | null;
};

// datetime-local strings ("2026-07-01T14:00") shown as "2026-07-01 14:00".
const formatSchedule = (s?: string | null): string | null => (s ? s.replace("T", " ") : null);

const env: Record<string, string | undefined> = (() => {
  if (typeof process !== "undefined" && typeof process.env !== "undefined") {
    return process.env as Record<string, string | undefined>;
  }
  if (
    typeof import.meta !== "undefined" &&
    typeof (import.meta as { env?: Record<string, string | undefined> }).env !== "undefined"
  ) {
    return (import.meta as { env?: Record<string, string | undefined> }).env!;
  }
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { env?: Record<string, string | undefined> }).env !== "undefined"
  ) {
    return (globalThis as { env?: Record<string, string | undefined> }).env!;
  }
  return {} as Record<string, string | undefined>;
})();

// Labels which site an alert came from — lets one bot/inbox serve many sites.
// Each deployment overrides this via the SITE_NAME env var.
const siteName = () => env.SITE_NAME?.trim() || "Phsar Ichiba";

// Brand logo shown atop customer emails. Must be a hosted URL — Gmail strips
// data: URIs. Other deployments override via the SITE_LOGO_URL env var.
const logoUrl = () => env.SITE_LOGO_URL?.trim() || "https://phsarichiba.com/brand/wordmark.png";
const logoHtml = () =>
  `<img src="${logoUrl()}" alt="${escapeHtml(siteName())}" width="120" style="display:block;margin:0 0 20px" />`;

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

const mapsUrl = (o: OrderNotification): string | null =>
  o.location_lat != null && o.location_lng != null
    ? `https://www.google.com/maps?q=${o.location_lat},${o.location_lng}`
    : null;

const itemRowsHtml = (items: OrderItem[], forStaff: boolean): string =>
  items
    .map(
      (i) =>
        `<tr><td style="padding:4px 10px">${i.qty}×</td><td style="padding:4px 10px">${escapeHtml(itemLabel(i, forStaff))}</td><td style="padding:4px 10px;text-align:right;white-space:nowrap">$${(i.price * i.qty).toFixed(2)}</td></tr>`,
    )
    .join("");

export async function notifyNewOrder(order: OrderNotification): Promise<void> {
  const short = order.id.slice(0, 8);
  const isPickup = order.fulfillment_method === "pickup";
  const shipTo = [order.address, order.city, order.postal_code].filter(Boolean).join(", ");
  const mapLink = mapsUrl(order);
  const schedule = formatSchedule(order.scheduled_at);
  const textSummary = [
    `Order #${short}`,
    `Customer: ${order.customer_name ?? "—"} (${order.customer_email ?? "—"})`,
    `Phone: ${order.customer_phone ?? "—"}`,
    ...(order.customer_number ? [`Customer #: ${order.customer_number}`] : []),
    isPickup ? "🏪 Store pickup" : `Deliver to: ${shipTo || "—"}`,
    ...(schedule ? [`🗓️ ${isPickup ? "Pickup" : "Scheduled"}: ${schedule}`] : []),
    ...(!isPickup && mapLink ? [`📍 Map: ${mapLink}`] : []),
    "Items:",
    ...order.items.map((i) => `  ${i.qty}× ${itemLabel(i, true)} — $${(i.price * i.qty).toFixed(2)}`),
    `Total: $${order.total.toFixed(2)}`,
  ].join("\n");

  // Fan out to every configured channel; one failing must not block the others or the order.
  const results = await Promise.allSettled([
    sendTelegram(textSummary),
    sendEmail(order, short, shipTo),
    sendCustomerEmail(order, short, shipTo),
  ]);
  if (results.every((r) => r.status === "fulfilled" && r.value === "skipped")) {
    // Nothing configured (e.g. local dev) — log so the order is still visible.
    console.log(`[order-notify]\n${textSummary}`);
  }
}

async function sendTelegram(text: string): Promise<"sent" | "skipped"> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return "skipped";
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: `🌐 Website: ${siteName()}\n🛎️ New order\n\n${text}`,
      disable_web_page_preview: true,
    };
    // Forum supergroups route messages into a specific topic by thread id.
    if (env.TELEGRAM_TOPIC_ID) payload.message_thread_id = Number(env.TELEGRAM_TOPIC_ID);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[order-notify] telegram failed", res.status, await res.text());
  } catch (e) {
    console.error("[order-notify] telegram error", e);
  }
  return "sent";
}

async function sendEmail(
  order: OrderNotification,
  short: string,
  shipTo: string,
): Promise<"sent" | "skipped"> {
  const to = (env.ADMIN_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!env.RESEND_API_KEY || to.length === 0) return "skipped";
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.RESEND_FROM ?? "Phsar Ichiba <onboarding@resend.dev>";
    const isPickup = order.fulfillment_method === "pickup";
    const rows = itemRowsHtml(order.items, true);
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        <p style="margin:0 0 8px;font-size:13px;color:#888">🌐 ${escapeHtml(siteName())}</p>
        <h2 style="margin:0 0 4px">🛎️ New order #${short}</h2>
        <p style="margin:0 0 16px;color:#555">A new order was just placed.</p>
        <p style="margin:0 0 2px"><strong>Customer:</strong> ${escapeHtml(order.customer_name ?? "—")}</p>
        <p style="margin:0 0 2px"><strong>Email:</strong> ${escapeHtml(order.customer_email ?? "—")}</p>
        <p style="margin:0 0 2px"><strong>Phone:</strong> ${escapeHtml(order.customer_phone ?? "—")}</p>
        ${order.customer_number ? `<p style="margin:0 0 2px"><strong>Customer #:</strong> ${escapeHtml(order.customer_number)}</p>` : ""}
        ${isPickup ? `<p style="margin:0 0 2px"><strong>🏪 Store pickup</strong></p>` : `<p style="margin:0 0 2px"><strong>Deliver to:</strong> ${escapeHtml(shipTo || "—")}</p>`}
        ${formatSchedule(order.scheduled_at) ? `<p style="margin:0 0 2px"><strong>🗓️ ${isPickup ? "Pickup" : "Scheduled"}:</strong> ${escapeHtml(formatSchedule(order.scheduled_at)!)}</p>` : ""}
        ${!isPickup && mapsUrl(order) ? `<p style="margin:0 0 16px"><strong>📍 Location:</strong> <a href="${mapsUrl(order)}">Open in Google Maps</a></p>` : ""}
        <table style="border-collapse:collapse;width:100%;border-top:1px solid #eee">${rows}</table>
        <p style="margin:16px 0 0;font-size:18px"><strong>Total: $${order.total.toFixed(2)}</strong></p>
      </div>`;
    await resend.emails.send({
      from,
      to,
      subject: `[${siteName()}] 🛎️ New order #${short} — $${order.total.toFixed(2)}`,
      html,
    });
  } catch (e) {
    console.error("[order-notify] email failed", e);
  }
  return "sent";
}

export type ShippedNotification = {
  id: string;
  items: OrderItem[];
  total: number;
  customer_name?: string | null;
  customer_email?: string | null;
  tracking_url?: string | null;
};

// Emails the customer when their order is marked shipped. Like the others, it
// never throws and silently skips when Resend or the customer email is missing.
export async function notifyOrderShipped(order: ShippedNotification): Promise<void> {
  const to = order.customer_email?.trim();
  if (!env.RESEND_API_KEY || !to) return;
  const short = order.id.slice(0, 8);
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.RESEND_FROM ?? "Phsar Ichiba <onboarding@resend.dev>";
    const name = order.customer_name?.trim() || "there";
    const track = order.tracking_url?.trim();
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        ${logoHtml()}
        <h2 style="margin:0 0 4px">Your order is on the way! 🛵</h2>
        <p style="margin:0 0 16px;color:#555">Hi ${escapeHtml(name)}, your order #${short} has been shipped and is out for delivery.</p>
        ${
          track
            ? `<p style="margin:0 0 20px"><a href="${escapeHtml(track)}" style="display:inline-block;background:#00b14f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">Track your delivery</a></p>`
            : ""
        }
        <table style="border-collapse:collapse;width:100%;border-top:1px solid #eee">${itemRowsHtml(order.items, false)}</table>
        <p style="margin:16px 0 0;font-size:18px"><strong>Total: $${order.total.toFixed(2)}</strong></p>
        <p style="margin:24px 0 0;font-size:13px;color:#888">${escapeHtml(siteName())}</p>
      </div>`;
    await resend.emails.send({
      from,
      to,
      subject: `Your ${siteName()} order #${short} is on the way 🛵`,
      html,
    });
  } catch (e) {
    console.error("[order-notify] shipped email failed", e);
  }
}

async function sendCustomerEmail(
  order: OrderNotification,
  short: string,
  shipTo: string,
): Promise<"sent" | "skipped"> {
  const to = order.customer_email?.trim();
  if (!env.RESEND_API_KEY || !to) return "skipped";
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.RESEND_FROM ?? "Phsar Ichiba <onboarding@resend.dev>";
    const name = order.customer_name?.trim() || "there";
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        ${logoHtml()}
        <h2 style="margin:0 0 4px">Thank you for your order, ${escapeHtml(name)}! 🙏</h2>
        <p style="margin:0 0 16px;color:#555">We've received your order and will start preparing it for you shortly. Thank you for shopping with us!</p>
        <p style="margin:0 0 2px"><strong>Order #:</strong> ${short}</p>
        ${order.fulfillment_method === "pickup" ? `<p style="margin:0 0 2px"><strong>🏪 Store pickup</strong></p>` : shipTo ? `<p style="margin:0 0 2px"><strong>Deliver to:</strong> ${escapeHtml(shipTo)}</p>` : ""}
        ${formatSchedule(order.scheduled_at) ? `<p style="margin:0 0 16px"><strong>🗓️ ${order.fulfillment_method === "pickup" ? "Pickup time" : "Scheduled for"}:</strong> ${escapeHtml(formatSchedule(order.scheduled_at)!)}</p>` : ""}
        <table style="border-collapse:collapse;width:100%;border-top:1px solid #eee">${itemRowsHtml(order.items, false)}</table>
        <p style="margin:16px 0 0;font-size:18px"><strong>Total: $${order.total.toFixed(2)}</strong></p>
        <p style="margin:24px 0 0;font-size:13px;color:#888">${escapeHtml(siteName())}</p>
      </div>`;
    await resend.emails.send({
      from,
      to,
      subject: `Your ${siteName()} order #${short} is confirmed`,
      html,
    });
  } catch (e) {
    console.error("[order-notify] customer email failed", e);
  }
  return "sent";
}

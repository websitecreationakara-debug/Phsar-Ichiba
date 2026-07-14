import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { product_ratings, products } from "@/db/schema";
import { getSessionUser, requireUser } from "./_auth";

type RatingSummary = { average: number | null; count: number; myStars: number | null };

// Average (rounded to 1 dp) + count of customer star ratings for a product.
async function summarize(
  db: ReturnType<typeof getDb>,
  productId: string,
): Promise<{ average: number | null; count: number }> {
  const [agg] = await db
    .select({
      avg: sql<number | null>`avg(${product_ratings.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(product_ratings)
    .where(eq(product_ratings.product_id, productId));
  const count = Number(agg?.count ?? 0);
  const average = agg?.avg != null ? Math.round(Number(agg.avg) * 10) / 10 : null;
  return { average, count };
}

// Public: the star summary for a product, plus the caller's own rating (or null
// if they're a guest or haven't rated) so the input can preselect it.
export const getProductRating = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }): Promise<RatingSummary> => {
    const db = getDb();
    const user = await getSessionUser();
    const { average, count } = await summarize(db, data.productId);
    let myStars: number | null = null;
    if (user) {
      const [mine] = await db
        .select({ stars: product_ratings.stars })
        .from(product_ratings)
        .where(
          and(eq(product_ratings.product_id, data.productId), eq(product_ratings.user_id, user.id)),
        );
      myStars = mine?.stars ?? null;
    }
    return { average, count, myStars };
  });

// Logged-in customers only. Upserts the caller's 1–5 star rating for a product,
// then denormalizes the new average onto products.rating so every storefront
// surface reflects it without extra queries.
export const rateProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { productId: string; stars: number }) => d)
  .handler(async ({ data }): Promise<RatingSummary> => {
    const user = await requireUser();
    const db = getDb();

    const stars = Math.round(Number(data.stars));
    if (!Number.isFinite(stars) || stars < 1 || stars > 5)
      throw new Error("Rating must be 1–5 stars");

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, data.productId));
    if (!product) throw new Error("Product not found");

    const now = new Date().toISOString();
    await db
      .insert(product_ratings)
      .values({ product_id: data.productId, user_id: user.id, stars, updated_at: now })
      .onConflictDoUpdate({
        target: [product_ratings.product_id, product_ratings.user_id],
        set: { stars, updated_at: now },
      });

    const { average, count } = await summarize(db, data.productId);
    if (average != null)
      await db
        .update(products)
        .set({ rating: average, updated_at: now })
        .where(eq(products.id, data.productId));

    return { average, count, myStars: stars };
  });

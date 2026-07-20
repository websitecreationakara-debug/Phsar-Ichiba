import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { renderErrorPage } from "./lib/error-page";
import { getAuth } from "./lib/auth";
import { getDb } from "./db";
import { media } from "./db/schema";
import { withBase } from "./lib/base-path";

// Security response headers on every response. Outermost in the chain so it
// stamps SSR pages, API, media — whatever flows back through next().
//   HSTS         — force HTTPS for a year (Cloudflare already serves HTTPS).
//   nosniff      — stop browsers MIME-sniffing responses into executable types.
//   frame SAMEORIGIN — block other sites from iframing us (clickjacking).
//   Referrer-Policy — don't leak full URLs to other origins.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  try {
    const h = result.response.headers;
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("X-Frame-Options", "SAMEORIGIN");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  } catch {
    // A few responses carry immutable headers — skip them rather than 500.
  }
  return result;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// better-auth owns every /api/auth/* route; short-circuit those to its handler.
// Prefixed with the configured base path (see lib/base-path.ts) since a
// subpath deployment (e.g. seatsfarm.com/phsarichiba/) receives requests
// with that prefix still attached — Cloudflare doesn't strip it.
const authMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  if (new URL(request.url).pathname.startsWith(withBase("/api/auth"))) {
    return getAuth().handler(request);
  }
  return next();
});

// Serve uploaded media stored as BLOBs in D1, same-origin under /media/<key>
// (or {basePath}/media/<key> under a subpath deployment).
const mediaMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const { pathname } = new URL(request.url);
  const mediaPrefix = withBase("/media/");
  if (!pathname.startsWith(mediaPrefix)) return next();

  const key = decodeURIComponent(pathname.slice(mediaPrefix.length));
  const [row] = await getDb().select().from(media).where(eq(media.key, key));
  if (!row?.data) return new Response("Not found", { status: 404 });

  return new Response(row.data as unknown as BodyInit, {
    headers: {
      "content-type": row.content_type ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});

// Server functions are same-origin RPC endpoints; reject cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware, authMiddleware, mediaMiddleware],
}));

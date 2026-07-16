import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { renderErrorPage } from "./lib/error-page";
import { getAuth } from "./lib/auth";
import { getDb } from "./db";
import { media } from "./db/schema";
import { withBase } from "./lib/base-path";

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
  requestMiddleware: [errorMiddleware, csrfMiddleware, authMiddleware, mediaMiddleware],
}));

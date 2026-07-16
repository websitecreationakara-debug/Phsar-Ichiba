// This app is normally deployed at the root of its own domain (e.g. the
// workers.dev URL), but can also be deployed under a subpath of a domain
// that serves other content too (e.g. seatsfarm.com/phsarichiba/) via a
// Cloudflare Worker Route scoped to that path. In that case Cloudflare does
// NOT strip the prefix — the worker sees the full incoming path, and any
// root-relative "/foo" URL emitted to the browser (img src, favicon, fetch)
// would resolve against the domain's true root, missing the app entirely.
//
// VITE_BASE_PATH (e.g. "/phsarichiba") is a build-time value — set it when
// building for a subpath deployment, leave it unset for a root deployment.
// It's baked into both the client and server (SSR/worker) bundles the same
// way VITE_RECAPTCHA_SITE_KEY is (see worker-env.d.ts).
export const BASE_PATH = (import.meta.env.VITE_BASE_PATH ?? "").replace(/\/+$/, "");

// Prefixes an app-root-relative path ("/media/xyz", "/favicon.ico") with the
// configured base path. Absolute URLs (http/https) and empty/nullish values
// pass through unchanged, since those already point somewhere specific.
export function withBase(path: string): string;
export function withBase(path: string | null | undefined): string | null | undefined;
export function withBase(path: string | null | undefined): string | null | undefined {
  if (!path || /^https?:\/\//.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";
import { withBase } from "./base-path";

// Same-origin: the client talks to /api/auth/* served by the request
// middleware (start.ts). `basePath` (not `baseURL`) is the override for the
// path portion — better-auth still derives the origin itself (window.location
// or BETTER_AUTH_URL), which must stay untouched here since it also carries
// protocol/host. Prefixed with the configured base path so it still resolves
// under a subpath deployment.
export const authClient = createAuthClient({
  basePath: withBase("/api/auth"),
  plugins: [adminClient(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

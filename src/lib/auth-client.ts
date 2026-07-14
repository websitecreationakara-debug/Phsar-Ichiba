import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";

// Same-origin: the client talks to /api/auth/* served by the request middleware.
export const authClient = createAuthClient({
  plugins: [adminClient(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

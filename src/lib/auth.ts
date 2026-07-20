import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { verifyPassword } from "better-auth/crypto";
import { admin, captcha, emailOTP, twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Resend } from "resend";
import { getDb, schema } from "@/db";
import { ac, roles } from "@/lib/admin-permissions";
import { isLegacyHash, verifyLegacyPassword } from "@/lib/legacy-password";
import { emailShell } from "@/lib/notify";
import { withBase } from "@/lib/base-path";

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

let _auth: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (_auth) return _auth;

  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  const from = env.RESEND_FROM ?? "Phsar Ichiba <onboarding@resend.dev>";

  const sendEmail = async (to: string, subject: string, html: string, logLine: string) => {
    if (!resend) {
      // No key configured (e.g. local dev): log the contents instead of failing the request.
      console.log(`[auth-email] ${subject} -> ${to}\n${logLine}`);
      return;
    }
    try {
      await resend.emails.send({ from, to, subject, html: emailShell(html) });
    } catch (e) {
      console.error("[auth-email] send failed", e);
    }
  };

  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  _auth = betterAuth<BetterAuthOptions>({
    baseURL: env.BETTER_AUTH_URL,
    // Matches the client's `basePath` (auth-client.ts) — must agree so a
    // subpath deployment's incoming /phsarichiba/api/auth/* requests (still
    // carrying the prefix; start.ts's authMiddleware forwards them as-is)
    // route to the right internal action instead of 404ing.
    basePath: withBase("/api/auth"),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins,
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
    user: {
      additionalFields: {
        userNumber: { type: "string", required: false, input: false },
        phone: { type: "string", required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      // Gate sign-in until the email is verified via the OTP code (emailOTP plugin below).
      requireEmailVerification: true,
      password: {
        // Accounts imported from the old WooCommerce site keep their WordPress
        // password hash (bcrypt "$wp$2y$..." or legacy phpass "$P$"/"$H$") so
        // migrated customers can sign in with their existing password.
        verify: async ({ hash, password }) => {
          if (isLegacyHash(hash)) return verifyLegacyPassword(hash, password);
          return verifyPassword({ hash, password });
        },
      },
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(
          user.email,
          "Reset your Phsar Ichiba password",
          `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
          url,
        );
      },
    },
    hooks: {
      // Admin accounts are off-limits to managers. better-auth's permission
      // model only checks WHAT action is taken, not WHO it targets — without
      // this, a manager could reset an admin's password (account takeover),
      // ban/delete an admin, or list an admin's session tokens. Every
      // /admin/* endpoint that targets a user carries `userId` in the body,
      // so one generic guard covers them all.
      before: createAuthMiddleware(async (ctx) => {
        if (!ctx.path.startsWith("/admin/")) return;
        const targetId = (ctx.body as { userId?: unknown } | undefined)?.userId;
        if (typeof targetId !== "string" || !targetId) return;
        const session = await getSessionFromCtx(ctx);
        const actorRoles = ((session?.user as { role?: string | null } | undefined)?.role ?? "")
          .split(",")
          .map((r) => r.trim());
        if (actorRoles.includes("admin") || !actorRoles.includes("manager")) return;
        const target = await ctx.context.internalAdapter.findUserById(targetId);
        const targetRoles = ((target as { role?: string | null } | null)?.role ?? "").split(",");
        if (targetRoles.map((r) => r.trim()).includes("admin")) {
          throw new APIError("FORBIDDEN", {
            message: "Managers cannot modify admin accounts",
          });
        }
      }),
    },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    plugins: [
      admin({ ac, roles }),
      // TOTP authenticator-app 2FA. When a user has it enabled, sign-in returns
      // a twoFactorRedirect instead of a session until they enter a valid code.
      // "issuer" is the label shown in Google Authenticator etc.
      twoFactor({ issuer: "Phsar Ichiba" }),
      // Google reCAPTCHA v3 on sign-up, sign-in, and password-reset requests.
      // Only active when the secret is configured — otherwise auth runs without
      // a captcha (the client also skips the token when no site key is set).
      // Default endpoints cover /sign-up/email, /sign-in/email, and (via substring
      // match) /email-otp/request-password-reset.
      ...(env.RECAPTCHA_SECRET_KEY
        ? [
            captcha({
              provider: "google-recaptcha",
              secretKey: env.RECAPTCHA_SECRET_KEY,
              minScore: 0.5,
            }),
          ]
        : []),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: async ({ email, otp }) => {
          await sendEmail(
            email,
            "Your Phsar Ichiba verification code",
            `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes.</p>`,
            `code: ${otp}`,
          );
        },
      }),
      tanstackStartCookies(),
    ],
  });

  return _auth;
}

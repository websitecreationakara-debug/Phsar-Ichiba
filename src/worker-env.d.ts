// Typed bindings/vars available on the Cloudflare Worker env, beyond what
// `wrangler types` generates from wrangler.jsonc bindings (worker-configuration.d.ts).
// This augments the same Cloudflare.Env interface that file declares.
declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL?: string;
    RESEND_API_KEY: string;
    RESEND_FROM?: string;
    ADMIN_NOTIFY_EMAIL?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    TELEGRAM_TOPIC_ID?: string;
    // KHQR payment gateway (PPCBank). Absent in mock mode — see src/lib/payment.ts.
    PPCBANK_BASE_URL?: string;
    PPCBANK_MERCHANT_CODE?: string;
    PPCBANK_PASSWORD?: string;
    // Comma-separated SHA-256 signing fingerprints for the Play Store TWA app,
    // served at /.well-known/assetlinks.json. From Play App Signing.
    ANDROID_CERT_SHA256?: string;
    // Google reCAPTCHA v3 server secret. When unset, the captcha plugin is not
    // registered (see src/lib/auth.ts). Pair with VITE_RECAPTCHA_SITE_KEY.
    RECAPTCHA_SECRET_KEY?: string;
  }
}

interface ImportMetaEnv {
  // Public reCAPTCHA v3 site key, inlined into the client bundle at build time.
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  // Dev-only auto sign-in credentials (see src/hooks/use-auth.tsx). Set in
  // .env.local, which is gitignored and absent from production builds.
  readonly VITE_DEV_ADMIN_EMAIL?: string;
  readonly VITE_DEV_ADMIN_PASSWORD?: string;
}

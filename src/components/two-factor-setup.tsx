import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Self-contained TOTP two-factor management, used both on the customer account
// page and in the admin 2FA gate. Enabling is a two-step better-auth flow:
//   1. enable({ password })  -> returns { totpURI, backupCodes } (not yet active)
//   2. verifyTotp({ code })  -> first valid code flips twoFactorEnabled = true
// Disabling requires the account password.

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";
const otpCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-ink outline-none focus:border-leaf-500";
const primaryBtn =
  "rounded-full bg-leaf-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-leaf-700 disabled:opacity-60";
const outlineBtn =
  "rounded-full border border-leaf-200 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-leaf-50 disabled:opacity-60";

// The shared secret for manual entry lives in the otpauth:// URI's query string.
function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorSetup({
  enabled,
  onChanged,
}: {
  enabled: boolean;
  onChanged?: () => void;
}) {
  // "idle" -> showing enabled/disabled summary; "setup" -> QR + code entry.
  const [phase, setPhase] = useState<"idle" | "password" | "setup" | "disable">("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!totpUri) return setQrSvg("");
    QRCode.toString(totpUri, { type: "svg", margin: 1, width: 200 }).then(setQrSvg, () => setQrSvg(""));
  }, [totpUri]);

  const reset = () => {
    setPhase("idle");
    setPassword("");
    setCode("");
    setTotpUri("");
    setBackupCodes([]);
    setError(null);
  };

  // Step 1: verify password and get the TOTP URI + backup codes.
  const beginEnable = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Wrong password");
    setTotpUri(res.data.totpURI);
    setBackupCodes(res.data.backupCodes);
    setPassword("");
    setPhase("setup");
  };

  // Step 2: first valid code activates 2FA.
  const confirmEnable = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Invalid code — check the 6 digits and try again");
    reset();
    onChanged?.();
  };

  const doDisable = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Wrong password");
    reset();
    onChanged?.();
  };

  const copyBackup = () => {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  // ---- Enabled summary ----
  if (enabled && phase === "idle") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-leaf-700">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">Two-factor authentication is on</span>
        </div>
        <p className="text-sm text-ink-soft">
          You'll enter a 6-digit code from your authenticator app each time you sign in.
        </p>
        <button className={outlineBtn} onClick={() => setPhase("disable")}>
          Turn off
        </button>
      </div>
    );
  }

  // ---- Disable: confirm password ----
  if (phase === "disable") {
    return (
      <div className="max-w-sm space-y-3">
        <p className="text-sm text-ink">Enter your account password to turn off two-factor authentication.</p>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Account password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        {error && <p className="text-sm text-tomato-600">{error}</p>}
        <div className="flex gap-2">
          <button className={outlineBtn} onClick={reset} disabled={busy}>
            Cancel
          </button>
          <button className={primaryBtn} onClick={doDisable} disabled={busy || !password}>
            {busy ? "Turning off…" : "Turn off 2FA"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Disabled summary / start enabling ----
  if (!enabled && phase === "idle") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-carrot-700">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-semibold">Two-factor authentication is off</span>
        </div>
        <p className="text-sm text-ink-soft">
          Add a second step at sign-in using an authenticator app (Google Authenticator, Authy, etc.). Even if your
          password is stolen, no one can sign in without your phone.
        </p>
        <button className={primaryBtn} onClick={() => setPhase("password")}>
          Set up 2FA
        </button>
      </div>
    );
  }

  // ---- Enabling step 1: password ----
  if (phase === "password") {
    return (
      <div className="max-w-sm space-y-3">
        <p className="text-sm text-ink">Confirm your account password to begin.</p>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Account password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        {error && <p className="text-sm text-tomato-600">{error}</p>}
        <div className="flex gap-2">
          <button className={outlineBtn} onClick={reset} disabled={busy}>
            Cancel
          </button>
          <button className={primaryBtn} onClick={beginEnable} disabled={busy || !password}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Enabling step 2: scan QR + enter code ----
  const manualSecret = secretFromUri(totpUri);
  return (
    <div className="space-y-5">
      <ol className="space-y-4 text-sm text-ink">
        <li>
          <p className="font-semibold">1. Scan this QR code with your authenticator app</p>
          <div className="mt-2 inline-block rounded-xl border border-leaf-100 bg-white p-3">
            {qrSvg ? (
              <div className="h-[200px] w-[200px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            ) : (
              <div className="grid h-[200px] w-[200px] place-items-center text-ink-soft">Loading…</div>
            )}
          </div>
          {manualSecret && (
            <p className="mt-2 text-xs text-ink-soft">
              Can't scan? Enter this key manually:{" "}
              <code className="rounded bg-leaf-50 px-1.5 py-0.5 font-mono text-ink">{manualSecret}</code>
            </p>
          )}
        </li>

        {backupCodes.length > 0 && (
          <li>
            <p className="font-semibold">2. Save your backup codes</p>
            <p className="mt-1 text-xs text-ink-soft">
              Keep these somewhere safe. Each one lets you sign in once if you lose your phone.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-leaf-100 bg-leaf-50/50 p-3 font-mono text-sm">
              {backupCodes.map((c) => (
                <span key={c} className="text-ink">
                  {c}
                </span>
              ))}
            </div>
            <button className={cn(outlineBtn, "mt-2 inline-flex items-center gap-1.5")} onClick={copyBackup}>
              {copied ? <Check className="h-4 w-4 text-leaf-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy codes"}
            </button>
          </li>
        )}

        <li>
          <p className="font-semibold">3. Enter the 6-digit code from the app to finish</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={cn(otpCls, "mt-2 max-w-[220px]")}
          />
        </li>
      </ol>

      {error && <p className="text-sm text-tomato-600">{error}</p>}
      <div className="flex gap-2">
        <button className={outlineBtn} onClick={reset} disabled={busy}>
          Cancel
        </button>
        <button className={primaryBtn} onClick={confirmEnable} disabled={busy || code.length < 6}>
          {busy ? "Verifying…" : "Verify & turn on"}
        </button>
      </div>
    </div>
  );
}

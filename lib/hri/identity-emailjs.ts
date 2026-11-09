// Production adapter for the OtpMailer seam: sends the code through the EmailJS REST API.
// Called from the server only, with the private key, so the browser never sees the code or any key.
// EmailJS dashboard: Account -> Security -> enable "Allow EmailJS API for non-browser applications".
// Template: "To Email" = {{to_email}}; body uses {{passcode}} and {{expires_minutes}}.
import type { OtpMailer } from "./identity";

const ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export type EmailJsConfig = {
  serviceId: string;
  templateIdTh: string;
  templateIdEn: string;
  publicKey: string;
  privateKey: string;
};

// Returns null when any setting is missing, so the caller can report the feature as unavailable.
export function emailJsConfigFromEnv(env: NodeJS.ProcessEnv = process.env): EmailJsConfig | null {
  const serviceId = env.EMAILJS_SERVICE_ID?.trim();
  const templateIdEn = env.EMAILJS_TEMPLATE_ID_EN?.trim() || env.EMAILJS_TEMPLATE_ID?.trim();
  const templateIdTh = env.EMAILJS_TEMPLATE_ID_TH?.trim() || templateIdEn;
  const publicKey = env.EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = env.EMAILJS_PRIVATE_KEY?.trim();
  if (!serviceId || !templateIdEn || !templateIdTh || !publicKey || !privateKey) return null;
  return { serviceId, templateIdTh, templateIdEn, publicKey, privateKey };
}

export function emailJsMailer(config: EmailJsConfig, fetchImpl: typeof fetch = fetch): OtpMailer {
  return {
    async send({ toEmail, code, expiresInMinutes, language }) {
      const res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: config.serviceId,
          template_id: language === "th" ? config.templateIdTh : config.templateIdEn,
          user_id: config.publicKey,
          accessToken: config.privateKey,
          template_params: { to_email: toEmail, passcode: code, expires_minutes: expiresInMinutes }
        }),
        signal: AbortSignal.timeout(8000)
      });
      // The response body may echo request details, so only the status is reported.
      if (!res.ok) throw new Error(`EmailJS responded ${res.status}`);
    }
  };
}

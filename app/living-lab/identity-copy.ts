import type { Lang } from "./copy";

export const identityCopy: Record<Lang, {
  title: string;
  why: string;
  optional: string;
  emailLabel: string;
  emailPlaceholder: string;
  send: string;
  sending: string;
  codeLabel: string;
  codeSentTo: (email: string) => string;
  verify: string;
  verifying: string;
  resend: string;
  resendIn: (s: number) => string;
  changeEmail: string;
  signedInAs: string;
  notYou: string;
  locked: string;
  required: string;
  savedUnder: (email: string) => string;
  privacy: string;
  consentFirst: string;
  deleteEmail: string;
  deleteConfirm: string;
  deleteYes: string;
  deleteNo: string;
  errors: Record<"invalid_email" | "rate_limited" | "send_failed" | "wrong_code" | "expired" | "too_many_attempts" | "unavailable" | "identity_required" | "consent_required", string>;
  waitSeconds: (s: number) => string;
}> = {
  en: {
    title: "Who is this passport for?",
    why: "Verify your email so that your passport is recorded as yours.",
    optional: "Optional: you can start without it. Verify your email if you want this passport recorded as yours.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    send: "Send code",
    sending: "Sending…",
    codeLabel: "6-digit code",
    codeSentTo: (email) => `We sent a code to ${email}. It works for 10 minutes. Check your spam folder if it is not there.`,
    verify: "Verify",
    verifying: "Checking…",
    resend: "Send a new code",
    resendIn: (s) => `New code in ${s} s`,
    changeEmail: "Use another email",
    signedInAs: "Saving as",
    notYou: "Not you?",
    locked: "You can switch person after this session.",
    required: "Verify your email below before the robot starts.",
    savedUnder: (email) => `Saved to ${email}`,
    privacy: "Your email only identifies who owns this data. Robots never see it, we never send marketing, and you can delete it at any time.",
    consentFirst: "Tick the consent box first. No email is stored until you agree.",
    deleteEmail: "Delete my email",
    deleteConfirm: "This deletes your email and signs you out. Passports you already saved stay, without your email. To remove one, delete it on its card with its edit key.",
    deleteYes: "Yes, delete my email",
    deleteNo: "Keep it",
    errors: {
      invalid_email: "Please enter a valid email address.",
      rate_limited: "Too many tries. Please wait a moment and try again.",
      send_failed: "We could not send the email right now. Please try again in a minute.",
      wrong_code: "That code is not right. Please check the email and try again.",
      expired: "This code has expired or was already used. Send a new code.",
      too_many_attempts: "Too many wrong codes. Send a new code.",
      unavailable: "Email verification is not available right now. Please ask the Living Lab team.",
      identity_required: "Please verify your email before saving your passport.",
      consent_required: "Please tick the consent box first."
    },
    waitSeconds: (s) => `(wait ${s} s)`
  },
  th: {
    title: "Passport นี้เป็นของใคร",
    why: "ยืนยันอีเมลเพื่อบันทึกว่า passport นี้เป็นของคุณ",
    optional: "ไม่บังคับ เริ่มได้เลยโดยไม่ต้องยืนยัน ถ้าต้องการบันทึกว่า passport นี้เป็นของคุณ ให้ยืนยันอีเมล",
    emailLabel: "อีเมล",
    emailPlaceholder: "you@example.com",
    send: "ส่งรหัส",
    sending: "กำลังส่ง…",
    codeLabel: "รหัส 6 หลัก",
    codeSentTo: (email) => `ส่งรหัสไปที่ ${email} แล้ว ใช้ได้ 10 นาที ถ้าไม่เจอให้ดูในโฟลเดอร์สแปม`,
    verify: "ยืนยัน",
    verifying: "กำลังตรวจ…",
    resend: "ส่งรหัสใหม่",
    resendIn: (s) => `ส่งใหม่ได้ใน ${s} วิ`,
    changeEmail: "ใช้อีเมลอื่น",
    signedInAs: "บันทึกในชื่อ",
    notYou: "ไม่ใช่คุณ?",
    locked: "เปลี่ยนคนได้หลังจบรอบนี้",
    required: "ยืนยันอีเมลด้านล่างก่อนเริ่ม",
    savedUnder: (email) => `บันทึกเป็นของ ${email}`,
    privacy: "อีเมลใช้ระบุเจ้าของข้อมูลเท่านั้น หุ่นยนต์มองไม่เห็นอีเมลของคุณ เราไม่ส่งโฆษณา และคุณลบได้ทุกเมื่อ",
    consentFirst: "กรุณาติ๊กยินยอมก่อน เราจะยังไม่เก็บอีเมลจนกว่าคุณจะยินยอม",
    deleteEmail: "ลบอีเมลของฉัน",
    deleteConfirm: "ระบบจะลบอีเมลของคุณและออกจากระบบ passport ที่บันทึกแล้วจะยังอยู่แต่ไม่ผูกกับอีเมล หากต้องการลบ ให้ลบที่การ์ดของใบนั้นด้วย edit key",
    deleteYes: "ยืนยันลบอีเมล",
    deleteNo: "ไม่ลบ",
    errors: {
      invalid_email: "กรุณากรอกอีเมลให้ถูกต้อง",
      rate_limited: "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
      send_failed: "ส่งอีเมลไม่สำเร็จในตอนนี้ กรุณาลองใหม่อีกครั้งในอีกสักครู่",
      wrong_code: "รหัสไม่ถูกต้อง กรุณาตรวจอีเมลแล้วลองใหม่",
      expired: "รหัสหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอรหัสใหม่",
      too_many_attempts: "ใส่รหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
      unavailable: "ระบบยืนยันอีเมลใช้งานไม่ได้ในขณะนี้ กรุณาติดต่อทีม Living Lab",
      identity_required: "กรุณายืนยันอีเมลก่อนบันทึก passport",
      consent_required: "กรุณาติ๊กยินยอมก่อน"
    },
    waitSeconds: (s) => `(รอ ${s} วิ)`
  }
};

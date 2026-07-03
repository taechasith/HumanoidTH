import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";
import { adminLoginAction } from "@/app/actions";

type SearchParams = Promise<{ error?: string; from?: string }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = params.error;
  const from = params.from || "/";

  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const localT = {
    en: {
      title: "Administrator Authentication",
      desc: "Enter your credentials to access secure system configuration and data ingestion tools.",
      email: "Email Address",
      password: "Security Password",
      btn: "Authorize Session",
      errorMsg: "Invalid credentials. Please verify your admin email and password.",
      banner: "Thailand Humanoid Atlas Console"
    },
    th: {
      title: "การยืนยันตัวตนผู้ดูแลระบบ",
      desc: "กรุณาระบุข้อมูลเพื่อเข้าสู่การจัดการระบบหลักและการเรียกใช้เครื่องมือดึงข้อมูลผ่าน API",
      email: "อีเมลผู้ดูแลระบบ",
      password: "รหัสผ่านความปลอดภัย",
      btn: "ยืนยันสิทธิ์การเข้าใช้งาน",
      errorMsg: "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่านอีกครั้ง",
      banner: "คอนโซลผู้ดูแลระบบคลังข้อมูลหุ่นยนต์ไทย"
    }
  }[lang];

  return (
    <div className="login-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .login-wrapper {
          min-height: 100vh;
          width: 100vw;
          background: #eae9df;
          background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
          background-size: 24px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          font-family: var(--font-inter), var(--font-noto-sans-thai), sans-serif;
        }

        .login-card {
          background: #08130f;
          border: 1px solid #11261f;
          border-radius: 16px;
          padding: 36px 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 50px rgba(5, 13, 10, 0.45);
          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .login-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid #14352a;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 2;
        }

        .login-desc {
          font-size: 13px;
          color: #78998c;
          line-height: 1.4;
          margin: 0 0 24px 0;
          position: relative;
          z-index: 2;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .login-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a3c2b5;
          font-weight: 600;
        }

        .login-input {
          background: rgba(20, 53, 42, 0.45);
          border: 1px solid rgba(20, 53, 42, 0.8);
          border-radius: 8px;
          color: #ffffff;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }

        .login-input:focus {
          border-color: #10B981;
          background: rgba(20, 53, 42, 0.65);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .login-btn {
          background: #10B981;
          color: #050e0a;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }

        .login-btn:hover {
          background: #34d399;
          transform: translateY(-1px);
        }

        .login-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fca5a5;
          font-size: 12.5px;
          line-height: 1.4;
          margin-bottom: 16px;
          position: relative;
          z-index: 2;
        }
      `}} />

      <div className="login-card">
        <img src="/logo.png" alt="Atlas Logo" className="login-logo" />
        <h2 className="login-title">{localT.title}</h2>
        <p className="login-desc">{localT.desc}</p>

        {error && (
          <div className="login-error">
            {localT.errorMsg}
          </div>
        )}

        <form className="login-form" action={adminLoginAction}>
          <input type="hidden" name="from" value={from} />
          
          <label className="login-label">
            {localT.email}
            <input 
              name="email" 
              type="email" 
              className="login-input" 
              required 
              placeholder="e.g. creativelab.co.th@gmail.com" 
            />
          </label>

          <label className="login-label">
            {localT.password}
            <input 
              name="password" 
              type="password" 
              className="login-input" 
              required 
              placeholder="••••••••••••" 
            />
          </label>

          <button type="submit" className="login-btn">
            {localT.btn}
          </button>
        </form>
      </div>
    </div>
  );
}

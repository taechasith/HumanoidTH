"use client";

export default function Loading() {
  return (
    <div className="loading-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 44px);
          background: #f4f6f4;
          font-family: var(--font-sans);
        }

        .loader-logo-wrap {
          position: relative;
          width: 150px;
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.5s ease-in-out infinite alternate;
        }

        .loader-logo-wrap::before {
          content: "";
          position: absolute;
          inset: -28px -34px -20px;
          border-radius: 50%;
          background:
            radial-gradient(circle at center, rgba(7, 31, 22, 0.96) 0%, rgba(12, 78, 50, 0.74) 38%, rgba(16, 185, 129, 0.22) 62%, transparent 78%);
          filter: blur(8px);
          transform: scale(1.08);
        }

        .loader-logo-wrap::after {
          content: "";
          position: absolute;
          inset: 16px 4px 2px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(2, 14, 10, 0.82) 0%, rgba(9, 48, 33, 0.58) 52%, transparent 76%);
          filter: blur(3px);
        }

        .loader-logo {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          max-height: 150px;
          object-fit: contain;
          filter: drop-shadow(0 10px 18px rgba(2, 14, 10, 0.54)) drop-shadow(0 0 22px rgba(12, 78, 50, 0.42));
        }

        .loading-text {
          margin-top: 24px;
          font-size: 15px;
          font-weight: 600;
          color: #121c17;
          letter-spacing: 0.5px;
          text-align: center;
          animation: textPulse 1.5s ease-in-out infinite alternate;
        }

        .loading-subtext {
          margin-top: 6px;
          font-size: 11px;
          font-family: var(--font-sans);
          color: #56645c;
          letter-spacing: 1px;
        }

        @keyframes pulse {
          0% {
            transform: translateY(0) scale(0.96);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-4px) scale(1);
            opacity: 1;
          }
        }

        @keyframes textPulse {
          0% {
            opacity: 0.6;
          }
          100% {
            opacity: 1;
          }
        }
      `}} />

      <div className="loader-logo-wrap">
        <img src="/logo.png" alt="Thailand Humanoid Atlas" className="loader-logo" />
      </div>
      <div className="loading-text">Accessing Thailand Humanoid Atlas...</div>
      <div className="loading-subtext">CONNECTING TO CORPUS NODE...</div>
    </div>
  );
}

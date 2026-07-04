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
          width: 120px;
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.5s ease-in-out infinite alternate;
        }

        .loader-logo-wrap::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 68%);
          filter: blur(2px);
        }

        .loader-logo {
          position: relative;
          width: 100%;
          height: auto;
          max-height: 150px;
          object-fit: contain;
          filter: drop-shadow(0 8px 18px rgba(20, 53, 42, 0.18));
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

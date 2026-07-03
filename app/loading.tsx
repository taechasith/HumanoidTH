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

        .loader-ring {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .loader-ring svg {
          width: 100%;
          height: 100%;
          animation: rotate 2s linear infinite;
        }

        .loader-ring circle {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
        }

        .loader-ring .track {
          stroke: rgba(20, 53, 42, 0.1);
        }

        .loader-ring .fill {
          stroke: #10B981; /* Emerald Green */
          stroke-dasharray: 226; /* 2 * pi * r (r=36 -> 226.19) */
          stroke-dashoffset: 60;
          animation: dash 1.5s ease-in-out infinite alternate;
        }

        .loader-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #EAB308; /* Yellow/Gold */
          animation: pulse 1.5s ease-in-out infinite alternate;
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
          font-family: monospace;
          color: #56645c;
          letter-spacing: 1px;
        }

        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dash {
          0% {
            stroke-dashoffset: 226;
          }
          100% {
            stroke-dashoffset: 40;
          }
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
            filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.6));
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

      <div className="loader-ring">
        <svg viewBox="0 0 80 80">
          <circle className="track" cx="40" cy="40" r="36" />
          <circle className="fill" cx="40" cy="40" r="36" />
        </svg>
        <div className="loader-center">
          <img src="/logo.png" alt="Atlas Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
      <div className="loading-text">Accessing Thailand Humanoid Atlas...</div>
      <div className="loading-subtext">CONNECTING TO CORPUS NODE...</div>
    </div>
  );
}

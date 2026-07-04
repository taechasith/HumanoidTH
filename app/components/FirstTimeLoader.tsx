"use client";

import { useEffect, useState } from "react";

export default function FirstTimeLoader() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const getStatusText = (prog: number) => {
    if (prog < 20) return "CONNECTING TO ECOSYSTEM CORE...";
    if (prog < 40) return "RESOLVING DATABASE SCHEMA...";
    if (prog < 60) return "LOADING GEOSPATIAL MAP NODES...";
    if (prog < 80) return "CALIBRATING KINEMATIC SOLVERS...";
    if (prog < 95) return "FINALIZING RENDER PIPELINE...";
    return "SYSTEM OPERATIONAL - STARTING";
  };

  useEffect(() => {
    setMounted(true);
    const hasLoaded = sessionStorage.getItem("th_atlas_loaded_before");
    if (!hasLoaded) {
      setShow(true);
      // Run progress bar animation
      const duration = 1600; // 1.6 seconds
      const intervalTime = 30;
      const steps = duration / intervalTime;
      const increment = 100 / steps;

      let currentProgress = 0;
      const timer = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(timer);
          // Wait briefly at 100% then start fadeOut
          setTimeout(() => {
            setFadeOut(true);
            // Fully remove loader after animation finishes
            setTimeout(() => {
              setShow(false);
              sessionStorage.setItem("th_atlas_loaded_before", "true");
            }, 600);
          }, 250);
        }
        setProgress(Math.round(currentProgress));
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, []);

  if (!mounted || !show) return null;

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at center, #0c2017 0%, #040907 100%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: var(--font-sans);
          transition: opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1), transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .splash-screen::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 1;
        }

        .splash-screen.fade-out {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }

        .splash-logo-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .splash-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(18, 168, 121, 0.45) 0%, transparent 70%);
          animation: pulseGlow 2s infinite ease-in-out;
        }

        .splash-logo {
          width: 118px;
          height: auto;
          max-height: 150px;
          object-fit: contain;
          filter: drop-shadow(0 0 14px rgba(18, 168, 121, 0.45));
          z-index: 2;
          animation: floatIcon 3s infinite ease-in-out;
        }

        .splash-brand {
          font-size: 15px;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: #a3b8ad;
          font-weight: 800;
          margin: 0;
          z-index: 2;
        }

        .splash-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #ffffff;
          margin: 6px 0 10px 0;
          text-align: center;
          z-index: 2;
        }

        .splash-title span {
          color: var(--warning);
        }

        .splash-advisory {
          color: #8fa396;
          font-size: 12.5px;
          font-weight: 600;
          line-height: 1.5;
          margin: 0 20px 30px;
          max-width: 420px;
          text-align: center;
          z-index: 2;
        }

        .splash-progress-wrapper {
          width: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 2;
        }

        .splash-progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
        }

        .splash-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          box-shadow: 0 0 8px #10b981;
          transition: width 0.03s linear;
        }

        .splash-status {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 11px;
          color: #708a7b;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }
      `}} />

      <div className="splash-logo-container">
        <div className="splash-glow" />
        <img src="/logo.png" alt="Thailand Humanoid Atlas" className="splash-logo" />
      </div>

      <p className="splash-brand">Thailand Humanoid</p>
      <h1 className="splash-title">Ecosystem <span>Atlas</span></h1>
      <p className="splash-advisory">For the most complete research-console experience, Thailand Humanoid Atlas is best viewed on a desktop display.</p>

      <div className="splash-progress-wrapper">
        <div className="splash-progress-track">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="splash-status">
          <span>{getStatusText(progress)}</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}

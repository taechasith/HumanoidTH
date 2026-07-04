"use client";

import { useEffect, useState, useRef } from "react";
import {
  Database,
  Cpu,
  Globe,
  Activity,
  Terminal,
  Server
} from "lucide-react";

const LOG_TEMPLATES = [
  "SYSTEM: Launching Thailand Humanoid Atlas core...",
  "SYSTEM: Initializing telemetry connection protocol...",
  "DATABASE: Connecting to PostgreSQL pool...",
  "DATABASE: Pool size: 10 connections established.",
  "SCHEMA: Resolving entity relations & model mappings...",
  "SCHEMA: 15 tables validated successfully.",
  "GEOSPATIAL: Loading province boundary datasets...",
  "GEOSPATIAL: 77 regional clusters resolved.",
  "NETWORKS: Constructing actor-graph model nodes...",
  "NETWORKS: 14 academic and research nodes compiled.",
  "KINEMATICS: Initializing robot models configuration...",
  "KINEMATICS: teal_v.2.glb model parsed: OK.",
  "ANALYTICS: Computing public perspective metrics...",
  "ANALYTICS: Sentiment vectors resolved: 84% relevance score.",
  "SYSTEM: Warm-organic-cream visual styles synchronized.",
  "SYSTEM: Establishing WS handshake stream...",
  "SYSTEM: Core modules online. Atlas environment operational."
];

export default function FirstTimeLoader() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const hasLoaded = sessionStorage.getItem("th_atlas_loaded_before");
    if (!hasLoaded) {
      setShow(true);
      // Run progress bar animation
      const duration = 2400; // 2.4 seconds is smooth and visible
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
          }, 350);
        }
        setProgress(Math.round(currentProgress));
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, []);

  // Increment elapsed time tracker
  useEffect(() => {
    if (show) {
      const timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [show]);

  // Auto-scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [progress]);

  if (!mounted || !show) return null;

  // Derived statuses for checklist
  const dbStatus = progress >= 25 ? "OK" : "CONNECTING";
  const graphStatus = progress >= 50 ? "OK" : progress >= 25 ? "RESOLVING" : "PENDING";
  const geoStatus = progress >= 70 ? "OK" : progress >= 50 ? "MAPPING" : "PENDING";
  const kineStatus = progress >= 90 ? "OK" : progress >= 70 ? "CALIBRATING" : "PENDING";
  const systemStatus = progress >= 98 ? "OK" : progress >= 90 ? "OPTIMIZING" : "PENDING";

  // Simulated metrics
  const simulatedMemory = (38.4 + (progress / 100) * 12.8 + Math.sin(elapsedTime * 0.1) * 0.3).toFixed(1);
  const simulatedLatency = Math.round(18 - (progress / 100) * 6 + Math.sin(elapsedTime * 0.05) * 2);
  const simulatedIngest = (progress === 100) ? "0.0" : (4.5 + Math.cos(elapsedTime * 0.08) * 0.4).toFixed(1);

  // Sync logs based on progress percentage
  const visibleLogsCount = Math.floor((progress / 100) * LOG_TEMPLATES.length);
  const logs = LOG_TEMPLATES.slice(0, Math.max(1, visibleLogsCount));

  // Time format helper
  const getFormattedTime = () => {
    const date = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const getStatusText = (prog: number) => {
    if (prog < 20) return "CONNECTING TO ECOSYSTEM CORE...";
    if (prog < 40) return "RESOLVING DATABASE SCHEMA...";
    if (prog < 60) return "LOADING GEOSPATIAL MAP NODES...";
    if (prog < 80) return "CALIBRATING KINEMATIC SOLVERS...";
    if (prog < 95) return "FINALIZING RENDER PIPELINE...";
    return "SYSTEM OPERATIONAL - STARTING";
  };

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at center, #071711 0%, #020504 100%);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: var(--font-sans);
          transition: opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1), transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          overflow: hidden;
          padding: 24px;
        }

        .splash-screen::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(52, 211, 153, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52, 211, 153, 0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 1;
        }

        .splash-screen.fade-out {
          opacity: 0;
          transform: scale(1.03);
          pointer-events: none;
        }

        .splash-container {
          width: 100%;
          max-width: 1200px;
          height: 100%;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 20px;
          z-index: 2;
        }

        .splash-hud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(52, 211, 153, 0.15);
          padding-bottom: 12px;
          font-size: 10px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .hud-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hud-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
        }

        .splash-grid {
          display: grid;
          grid-template-columns: 260px 1fr 260px;
          gap: 24px;
          flex: 1;
          align-items: center;
        }

        .splash-panel {
          background: rgba(9, 22, 17, 0.7);
          border: 1px solid rgba(52, 211, 153, 0.18);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }

        .panel-title {
          font-size: 10px;
          font-weight: 850;
          color: #a3b8ad;
          letter-spacing: 1.5px;
          border-bottom: 1px solid rgba(52, 211, 153, 0.1);
          padding-bottom: 8px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .panel-title-icon {
          width: 12px;
          height: 12px;
          color: #34d399;
        }

        .checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          color: #dce8e3;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(52, 211, 153, 0.03);
          border: 1px solid rgba(52, 211, 153, 0.05);
        }

        .checklist-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .checklist-status {
          font-family: monospace;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .status-ok {
          background: rgba(52, 211, 153, 0.12);
          color: #34d399;
        }

        .status-active {
          background: rgba(226, 168, 41, 0.12);
          color: #e2a829;
          animation: pulse-status 1.2s ease-in-out infinite;
        }

        .status-pending {
          background: rgba(255, 255, 255, 0.05);
          color: #708a7b;
        }

        @keyframes pulse-status {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .splash-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          position: relative;
        }

        .splash-logo-container {
          position: relative;
          width: 320px;
          height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .splash-glow {
          position: absolute;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
          animation: pulseGlow 2.5s infinite ease-in-out;
          z-index: 0;
        }

        .splash-logo {
          width: 105px;
          height: auto;
          max-height: 130px;
          object-fit: contain;
          filter: drop-shadow(0 0 16px rgba(52, 211, 153, 0.4));
          z-index: 3;
          animation: floatIcon 3s infinite ease-in-out;
        }

        .blueprint-overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 1;
          pointer-events: none;
        }

        .laser-container {
          animation: laser-sweep 4.5s ease-in-out infinite;
        }

        @keyframes laser-sweep {
          0% { transform: translateY(10px); }
          50% { transform: translateY(240px); }
          100% { transform: translateY(10px); }
        }

        .blueprint-svg circle[fill="var(--warning)"],
        .blueprint-svg circle[fill="#e2a829"] {
          animation: pulse-joint 1.5s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }

        @keyframes pulse-joint {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
        }

        .hud-spinner {
          transform-origin: center;
          animation: hud-spin 4s linear infinite;
        }
        .hud-counter-spinner {
          transform-origin: center;
          animation: hud-reverse-spin 7s linear infinite;
        }

        @keyframes hud-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hud-reverse-spin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        .splash-titles {
          text-align: center;
          z-index: 3;
        }

        .splash-brand {
          font-size: 14px;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: #a3b8ad;
          font-weight: 800;
          margin: 0;
        }

        .splash-title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #ffffff;
          margin: 6px 0 10px 0;
          text-align: center;
        }

        .splash-title span {
          color: #e2a829;
        }

        .splash-advisory {
          color: #8fa396;
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.5;
          margin: 0 auto;
          max-width: 440px;
          text-align: center;
        }

        .splash-progress-wrapper {
          width: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 3;
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
          font-size: 10px;
          color: #708a7b;
          font-weight: 650;
          letter-spacing: 0.5px;
        }

        .gauge-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gauge-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .gauge-label {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 750;
          color: #a3b8ad;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .gauge-value {
          font-family: monospace;
          color: #eef7f2;
          font-weight: 700;
        }

        .gauge-track {
          height: 4px;
          background: rgba(52, 211, 153, 0.08);
          border-radius: 2px;
          overflow: hidden;
        }

        .gauge-bar {
          height: 100%;
          background: #10b981;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .gauge-bar-warning {
          background: #e2a829;
        }

        .wave-container {
          margin-top: 6px;
          border: 1px solid rgba(52, 211, 153, 0.1);
          border-radius: 6px;
          padding: 6px;
          background: rgba(52, 211, 153, 0.01);
        }

        .telemetry-wave {
          stroke-dasharray: 60 10;
          animation: wave-scroll 2.5s linear infinite;
        }

        @keyframes wave-scroll {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -70; }
        }

        .splash-console-panel {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .console-title {
          font-size: 9px;
          font-weight: 850;
          color: #34d399;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .splash-console {
          background: #030806;
          border: 1px solid rgba(52, 211, 153, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-family: monospace;
          font-size: 11px;
          color: #a3b8ad;
          height: 95px;
          overflow-y: auto;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
          scrollbar-width: thin;
          scrollbar-color: rgba(52, 211, 153, 0.2) transparent;
        }

        .splash-console::-webkit-scrollbar {
          width: 4px;
        }

        .splash-console::-webkit-scrollbar-thumb {
          background: rgba(52, 211, 153, 0.2);
          border-radius: 2px;
        }

        .console-line {
          line-height: 1.5;
          margin-bottom: 3px;
          white-space: pre-wrap;
        }

        .console-time {
          color: #e2a829;
          margin-right: 8px;
          opacity: 0.85;
        }

        .console-text {
          color: #eef7f2;
        }

        .console-text-system {
          color: #38bdf8;
        }

        .console-text-db {
          color: #c084fc;
        }

        .console-text-success {
          color: #34d399;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 0.95; }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.01); }
        }

        @media (max-width: 900px) {
          .splash-grid {
            grid-template-columns: 1fr;
          }
          .splash-panel {
            display: none;
          }
          .splash-logo-container {
            width: 250px;
            height: 220px;
          }
          .splash-title {
            font-size: 22px;
          }
          .splash-brand {
            font-size: 12px;
          }
          .splash-advisory {
            font-size: 11px;
            margin-bottom: 5px;
          }
          .splash-container {
            max-height: none;
          }
        }
      `}} />

      <div className="splash-container">
        {/* HUD Top Bar */}
        <div className="splash-hud-header">
          <div className="hud-header-left">
            <span className="hud-dot animate-ping" />
            <span>SECURE SYSTEM ARCHITECTURE PORTAL</span>
          </div>
          <div className="hud-header-right">
            <span>CORE ENG V0.2.0</span>
          </div>
        </div>

        {/* Dashboard Panels Grid */}
        <div className="splash-grid">
          {/* Left panel: Sub-modules */}
          <div className="splash-panel">
            <div className="panel-title">
              <Server className="panel-title-icon" />
              <span>Atlas Core Modules</span>
            </div>
            <div className="checklist">
              <div className="checklist-item">
                <span className="checklist-label">
                  <Database className="size-3.5" style={{ color: "#34d399" }} />
                  Database Link
                </span>
                <span className={`checklist-status ${dbStatus === "OK" ? "status-ok" : "status-active"}`}>
                  {dbStatus}
                </span>
              </div>
              <div className="checklist-item">
                <span className="checklist-label">
                  <Globe className="size-3.5" style={{ color: "#34d399" }} />
                  Ecosystem Graph
                </span>
                <span className={`checklist-status ${
                  graphStatus === "OK" ? "status-ok" : graphStatus === "RESOLVING" ? "status-active" : "status-pending"
                }`}>
                  {graphStatus}
                </span>
              </div>
              <div className="checklist-item">
                <span className="checklist-label">
                  <Activity className="size-3.5" style={{ color: "#34d399" }} />
                  Geospatial Engine
                </span>
                <span className={`checklist-status ${
                  geoStatus === "OK" ? "status-ok" : geoStatus === "MAPPING" ? "status-active" : "status-pending"
                }`}>
                  {geoStatus}
                </span>
              </div>
              <div className="checklist-item">
                <span className="checklist-label">
                  <Cpu className="size-3.5" style={{ color: "#34d399" }} />
                  Kinematics Solver
                </span>
                <span className={`checklist-status ${
                  kineStatus === "OK" ? "status-ok" : kineStatus === "CALIBRATING" ? "status-active" : "status-pending"
                }`}>
                  {kineStatus}
                </span>
              </div>
              <div className="checklist-item">
                <span className="checklist-label">
                  <Server className="size-3.5" style={{ color: "#34d399" }} />
                  System Pipelines
                </span>
                <span className={`checklist-status ${
                  systemStatus === "OK" ? "status-ok" : systemStatus === "OPTIMIZING" ? "status-active" : "status-pending"
                }`}>
                  {systemStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Logo & Technical Wireframe Blueprint */}
          <div className="splash-center">
            <div className="splash-logo-container">
              <div className="splash-glow" />
              
              {/* Spinning circular HUD around the logo */}
              <div className="blueprint-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 100 100" style={{ width: "210px", height: "210px" }}>
                  <circle cx="50" cy="50" r="46" stroke="rgba(52, 211, 153, 0.08)" strokeWidth="1" fill="none" strokeDasharray="3 3" />
                  <circle cx="50" cy="50" r="41" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="80 180" className="hud-spinner" />
                  <circle cx="50" cy="50" r="35" stroke="#e2a829" strokeWidth="1" fill="none" strokeDasharray="20 40" className="hud-counter-spinner" />
                </svg>
              </div>

              {/* Wireframe Humanoid Blueprint behind/around the logo */}
              <div className="blueprint-overlay">
                <svg viewBox="0 0 200 240" className="blueprint-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  {/* Robot head */}
                  <circle cx="100" cy="40" r="14" stroke="rgba(52, 211, 153, 0.4)" strokeWidth="1.5" fill="none" />
                  <line x1="92" y1="40" x2="108" y2="40" stroke="rgba(226, 168, 41, 0.5)" strokeWidth="1.5" />
                  
                  {/* Spine */}
                  <path d="M100,54 L100,125" stroke="rgba(52, 211, 153, 0.4)" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Torso segments */}
                  <polygon points="85,67 115,67 110,95 90,95" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" fill="none" />
                  <polygon points="90,98 110,98 106,120 94,120" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="1" fill="none" />

                  {/* Shoulders */}
                  <circle cx="68" cy="70" r="3.5" fill="#e2a829" />
                  <circle cx="132" cy="70" r="3.5" fill="#e2a829" />

                  {/* Arms */}
                  <line x1="68" y1="70" x2="58" y2="105" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="1.5" />
                  <circle cx="58" cy="105" r="2.5" fill="rgba(52, 211, 153, 0.5)" />
                  <line x1="58" y1="105" x2="52" y2="135" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1" />
                  <circle cx="52" cy="135" r="3.5" stroke="#e2a829" strokeWidth="0.8" fill="none" />

                  <line x1="132" y1="70" x2="142" y2="105" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="1.5" />
                  <circle cx="142" cy="105" r="2.5" fill="rgba(52, 211, 153, 0.5)" />
                  <line x1="142" y1="105" x2="148" y2="135" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1" />
                  <circle cx="148" cy="135" r="3.5" stroke="#e2a829" strokeWidth="0.8" fill="none" />

                  {/* Pelvis */}
                  <line x1="86" y1="125" x2="114" y2="125" stroke="rgba(52, 211, 153, 0.4)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="86" cy="125" r="3.5" fill="#e2a829" />
                  <circle cx="114" cy="125" r="3.5" fill="#e2a829" />

                  {/* Legs */}
                  <line x1="86" y1="125" x2="82" y2="170" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="2" />
                  <circle cx="82" cy="170" r="3" fill="rgba(52, 211, 153, 0.4)" />
                  <line x1="82" y1="170" x2="78" y2="215" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" />
                  <line x1="78" y1="215" x2="68" y2="220" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="2" />

                  <line x1="114" y1="125" x2="118" y2="170" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="2" />
                  <circle cx="118" cy="170" r="3" fill="rgba(52, 211, 153, 0.4)" />
                  <line x1="118" y1="170" x2="122" y2="215" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" />
                  <line x1="122" y1="215" x2="132" y2="220" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="2" />

                  {/* Diagnostic details */}
                  <text x="100" y="8" fontSize="5" fill="rgba(52, 211, 153, 0.6)" textAnchor="middle" letterSpacing="0.3" fontFamily="monospace" fontWeight="bold">VISUAL_SENSORS: OK</text>
                  <text x="35" y="72" fontSize="5" fill="rgba(52, 211, 153, 0.6)" textAnchor="end" letterSpacing="0.3" fontFamily="monospace" fontWeight="bold">ARM_SERVO: ACT</text>
                  <text x="165" y="72" fontSize="5" fill="rgba(52, 211, 153, 0.6)" textAnchor="start" letterSpacing="0.3" fontFamily="monospace" fontWeight="bold">TELEMETRY: LOADED</text>
                  <text x="35" y="127" fontSize="5" fill="#e2a829" textAnchor="end" letterSpacing="0.3" fontFamily="monospace" fontWeight="bold">CORE_GRID: 98%</text>

                  {/* Sweeping Laser Line overlay */}
                  <g className="laser-container">
                    <line x1="5" y1="0" x2="195" y2="0" stroke="#34d399" strokeWidth="1.2" opacity="0.65" />
                    <polygon points="5,-6 195,-6 195,6 5,6" fill="url(#splash-laser-glow)" opacity="0.1" />
                  </g>

                  <defs>
                    <linearGradient id="splash-laser-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
                      <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Glowing logo in the center */}
              <img src="/logo.png" alt="Thailand Humanoid Atlas" className="splash-logo" />
            </div>

            {/* Brand Title */}
            <div className="splash-titles">
              <p className="splash-brand">Thailand Humanoid</p>
              <h1 className="splash-title">Ecosystem <span>Atlas</span></h1>
              <p className="splash-advisory">For the most complete research-console experience, Thailand Humanoid Atlas is best viewed on a desktop display.</p>
            </div>

            {/* Progress bar */}
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

          {/* Right panel: Diagnostics Gauges */}
          <div className="splash-panel">
            <div className="panel-title">
              <Activity className="panel-title-icon" />
              <span>Diagnostics Telemetry</span>
            </div>
            
            <div className="gauge-list">
              <div className="gauge-item">
                <div className="gauge-label">
                  <span>Memory Overhead</span>
                  <span className="gauge-value">{simulatedMemory} MB</span>
                </div>
                <div className="gauge-track">
                  <div className="gauge-bar" style={{ width: `${(parseFloat(simulatedMemory) / 60) * 100}%` }} />
                </div>
              </div>

              <div className="gauge-item">
                <div className="gauge-label">
                  <span>Server Latency</span>
                  <span className="gauge-value">{simulatedLatency} ms</span>
                </div>
                <div className="gauge-track">
                  <div className="gauge-bar" style={{ width: `${(simulatedLatency / 25) * 100}%` }} />
                </div>
              </div>

              <div className="gauge-item">
                <div className="gauge-label">
                  <span>Stream Buffer</span>
                  <span className="gauge-value">{simulatedIngest} kb/s</span>
                </div>
                <div className="gauge-track">
                  <div className="gauge-bar gauge-bar-warning" style={{ width: `${(parseFloat(simulatedIngest) / 6) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="wave-container">
              <div className="gauge-label" style={{ marginBottom: "4px", fontSize: "9px" }}>
                <span>Wave Modulator</span>
              </div>
              <svg viewBox="0 0 100 24" width="100%" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,12 L15,12 L20,3 L25,21 L30,12 L45,12 L50,1 L55,23 L60,12 L75,12 L80,5 L85,19 L90,12 L100,12" stroke="#34d399" strokeWidth="1.2" className="telemetry-wave" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Panel: Scrolling diagnostics terminal */}
        <div className="splash-console-panel">
          <div className="console-title">
            <Terminal className="size-3.5" style={{ color: "#e2a829" }} />
            <span>Initialization Boot Console Logs</span>
          </div>
          <div className="splash-console">
            {logs.map((log, index) => {
              const isSystem = log.startsWith("SYSTEM:");
              const isDatabase = log.startsWith("DATABASE:");
              const isSuccess = log.includes("success") || log.includes("complete") || log.includes("OK") || log.includes("operational");
              
              let textClass = "console-text";
              if (isSystem) textClass = "console-text-system";
              else if (isDatabase) textClass = "console-text-db";
              else if (isSuccess) textClass = "console-text-success";

              return (
                <div key={index} className="console-line">
                  <span className="console-time">[{getFormattedTime()}]</span>
                  <span className={textClass}>{log}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

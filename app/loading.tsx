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
  "SYSTEM: Booting Atlas console interface...",
  "SYSTEM: Active console pipeline detected...",
  "DATABASE: Connecting to relational database...",
  "DATABASE: Connected to PostgreSQL pool: 12 connections active.",
  "SCHEMA: Verifying schema integrity...",
  "SCHEMA: 15 tables validated successfully.",
  "TELEMETRY: Querying SourceRecord cache...",
  "TELEMETRY: 2,492 records retrieved from pipeline.",
  "MODULE: Loading Geospatial Map layers...",
  "MODULE: Map polygons loaded: 77 provinces resolved.",
  "MODULE: Network engine parsing actor structures...",
  "MODULE: 14 academic/industry nodes mapped.",
  "ROBOTS: Constructing kinematic configurations...",
  "ROBOTS: Pre-rendering teal_v.2.glb skeleton map...",
  "ROBOTS: 12 core humanoid models validated.",
  "PERSPECTIVES: Syncing public sentiment vectors...",
  "PERSPECTIVES: Social channels indexing complete.",
  "ANALYTICS: Computing repository index stats...",
  "ANALYTICS: Metrics aggregated (avg. relevance: 84%).",
  "SYSTEM: Warm-organic-cream theme mapped.",
  "SYSTEM: Establishing secure WS subscription...",
  "SYSTEM: Handshake complete. Status: Operational."
];

export default function Loading() {
  const [progress, setProgress] = useState(15);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize first few logs immediately
  useEffect(() => {
    setLogs(LOG_TEMPLATES.slice(0, 4));
  }, []);

  // Update progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 99) {
          // Fast at first, slows down towards the end
          const increment = prev < 50 ? 6 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 99);
        }
        return 99;
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, []);

  // Update simulated log terminal
  useEffect(() => {
    let logIndex = 4;
    const logInterval = setInterval(() => {
      if (logIndex < LOG_TEMPLATES.length) {
        setLogs((prev) => [...prev, LOG_TEMPLATES[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 450);

    return () => clearInterval(logInterval);
  }, []);

  // Increment elapsed time tracker
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Derived statuses for checklist
  const dbStatus = progress >= 30 ? "OK" : "CONNECTING";
  const nodeStatus = progress >= 55 ? "OK" : progress >= 30 ? "SYNCING" : "PENDING";
  const geoStatus = progress >= 75 ? "OK" : progress >= 55 ? "CALIBRATING" : "PENDING";
  const kineStatus = progress >= 90 ? "OK" : progress >= 75 ? "STANDBY" : "PENDING";
  const pipelineStatus = progress >= 98 ? "OK" : progress >= 90 ? "STREAMING" : "PENDING";

  // Simulated metrics
  const simulatedMemory = (45.2 + Math.sin(elapsedTime * 0.1) * 0.6).toFixed(1);
  const simulatedLatency = Math.round(12 + Math.sin(elapsedTime * 0.05) * 2);
  const simulatedIngest = (3.8 + Math.cos(elapsedTime * 0.08) * 0.4).toFixed(1);

  // Time format helper
  const getFormattedTime = () => {
    const date = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  return (
    <div className="immersive-loader">
      <style dangerouslySetInnerHTML={{ __html: `
        .immersive-loader {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: calc(100vh - 44px);
          width: 100%;
          gap: 20px;
          font-family: var(--font-sans);
          position: relative;
          z-index: 10;
        }

        .grid-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(74, 124, 89, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74, 124, 89, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
          pointer-events: none;
          z-index: -1;
        }

        .loader-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
        }

        .loader-header-title {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loader-header-status {
          font-size: 11px;
          font-weight: 700;
          color: var(--warning);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .loader-grid {
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 20px;
          flex: 1;
          align-items: stretch;
        }

        .loader-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow-soft);
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          font-weight: 850;
          border-bottom: 1px solid rgba(74, 124, 89, 0.1);
          padding-bottom: 8px;
        }

        .panel-header-icon {
          width: 14px;
          height: 14px;
          color: var(--accent);
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
          color: var(--text-primary);
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(74, 124, 89, 0.03);
          border: 1px solid rgba(74, 124, 89, 0.05);
          transition: all 0.3s ease;
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
          background: rgba(74, 124, 89, 0.12);
          color: var(--accent);
        }

        .status-active {
          background: rgba(177, 143, 47, 0.12);
          color: var(--warning);
          animation: pulse-status 1.2s ease-in-out infinite;
        }

        .status-pending {
          background: rgba(46, 50, 48, 0.06);
          color: var(--text-secondary);
        }

        @keyframes pulse-status {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .loader-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          position: relative;
        }

        .blueprint-container {
          width: 100%;
          max-width: 340px;
          height: 310px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .pulse-bg {
          position: absolute;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(74, 124, 89, 0.09) 0%, transparent 70%);
          animation: pulse-glow 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }

        .hud-overlay {
          position: absolute;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
        }

        .hud-percentage {
          font-family: monospace;
          font-size: 16px;
          font-weight: 800;
          fill: var(--text-primary);
        }

        @keyframes hud-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hud-reverse-spin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .hud-spinner {
          transform-origin: center;
          animation: hud-spin 4s linear infinite;
        }
        .hud-counter-spinner {
          transform-origin: center;
          animation: hud-reverse-spin 7s linear infinite;
        }

        .laser-container {
          animation: laser-sweep 4.5s ease-in-out infinite;
        }

        @keyframes laser-sweep {
          0% { transform: translateY(15px); }
          50% { transform: translateY(220px); }
          100% { transform: translateY(15px); }
        }

        .blueprint-svg circle[fill="var(--warning)"] {
          animation: pulse-joint 1.5s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }

        @keyframes pulse-joint {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 1; }
        }

        .center-status-text {
          font-size: 11px;
          font-weight: 850;
          color: var(--text-secondary);
          letter-spacing: 2px;
          text-transform: uppercase;
          text-align: center;
          margin-top: 8px;
        }

        .loading-dots span {
          animation: dot-blink 1.4s infinite both;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-blink {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }

        .gauge-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .gauge-value {
          font-family: monospace;
          color: var(--text-primary);
          font-weight: 700;
        }

        .gauge-track {
          height: 4px;
          background: rgba(74, 124, 89, 0.08);
          border-radius: 2px;
          overflow: hidden;
        }

        .gauge-bar {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .gauge-bar-warning {
          background: var(--warning);
        }

        .wave-container {
          margin-top: 8px;
          border: 1px solid rgba(74, 124, 89, 0.08);
          border-radius: 6px;
          padding: 6px;
          background: rgba(74, 124, 89, 0.01);
        }

        .telemetry-wave {
          stroke-dasharray: 60 10;
          animation: wave-scroll 2.5s linear infinite;
        }

        @keyframes wave-scroll {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -70; }
        }

        .loader-console-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loader-console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-secondary);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .loader-console {
          background: #091713;
          border: 1px solid rgba(74, 124, 89, 0.25);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: monospace;
          font-size: 11px;
          color: #a3b8ad;
          height: 115px;
          overflow-y: auto;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
          scrollbar-width: thin;
          scrollbar-color: rgba(74, 124, 89, 0.3) transparent;
        }

        .loader-console::-webkit-scrollbar {
          width: 4px;
        }

        .loader-console::-webkit-scrollbar-thumb {
          background: rgba(74, 124, 89, 0.3);
          border-radius: 2px;
        }

        .console-line {
          line-height: 1.5;
          margin-bottom: 3px;
          white-space: pre-wrap;
        }

        .console-time {
          color: var(--warning);
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

        @media (max-width: 1024px) {
          .loader-grid {
            grid-template-columns: 1fr;
          }
          .loader-left, .loader-right {
            display: none;
          }
          .blueprint-container {
            height: 280px;
          }
        }
      `}} />

      <div className="grid-bg" />

      {/* Top Header Row */}
      <div className="loader-header">
        <div className="loader-header-title">
          <Cpu className="size-4 animate-pulse" />
          <span>Thailand Humanoid Atlas Console</span>
        </div>
        <div className="loader-header-status">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping inline-block" style={{ backgroundColor: "#10b981" }} />
          <span>Ecosystem Sync Initializing</span>
        </div>
      </div>

      {/* Mid panels grid */}
      <div className="loader-grid">
        {/* Left Side: System Modules */}
        <div className="loader-panel loader-left">
          <div className="panel-header">
            <Server className="panel-header-icon" />
            <span>Atlas Core Modules</span>
          </div>
          <div className="checklist">
            <div className="checklist-item">
              <span className="checklist-label">
                <Database className="size-3.5" style={{ color: "var(--accent)" }} />
                PostgreSQL Link
              </span>
              <span className={`checklist-status ${dbStatus === "OK" ? "status-ok" : "status-active"}`}>
                {dbStatus}
              </span>
            </div>
            <div className="checklist-item">
              <span className="checklist-label">
                <Globe className="size-3.5" style={{ color: "var(--accent)" }} />
                Ecosystem Graph
              </span>
              <span className={`checklist-status ${
                nodeStatus === "OK" ? "status-ok" : nodeStatus === "SYNCING" ? "status-active" : "status-pending"
              }`}>
                {nodeStatus}
              </span>
            </div>
            <div className="checklist-item">
              <span className="checklist-label">
                <Activity className="size-3.5" style={{ color: "var(--accent)" }} />
                Geospatial Engine
              </span>
              <span className={`checklist-status ${
                geoStatus === "OK" ? "status-ok" : geoStatus === "CALIBRATING" ? "status-active" : "status-pending"
              }`}>
                {geoStatus}
              </span>
            </div>
            <div className="checklist-item">
              <span className="checklist-label">
                <Cpu className="size-3.5" style={{ color: "var(--accent)" }} />
                Kinematic Solvers
              </span>
              <span className={`checklist-status ${
                kineStatus === "OK" ? "status-ok" : kineStatus === "STANDBY" ? "status-active" : "status-pending"
              }`}>
                {kineStatus}
              </span>
            </div>
            <div className="checklist-item">
              <span className="checklist-label">
                <Server className="size-3.5" style={{ color: "var(--accent)" }} />
                Ingest Data Pipeline
              </span>
              <span className={`checklist-status ${
                pipelineStatus === "OK" ? "status-ok" : pipelineStatus === "STREAMING" ? "status-active" : "status-pending"
              }`}>
                {pipelineStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Glowing Blueprint Visualizer */}
        <div className="loader-panel loader-center">
          <div className="pulse-bg" />
          <div className="blueprint-container">
            {/* The Humanoid Schematic SVG */}
            <svg viewBox="0 0 200 240" className="blueprint-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              {/* Outer HUD Rings */}
              <circle cx="100" cy="115" r="95" stroke="rgba(74, 124, 89, 0.08)" strokeWidth="1" fill="none" strokeDasharray="4 8" />
              <circle cx="100" cy="115" r="75" stroke="rgba(74, 124, 89, 0.12)" strokeWidth="1.5" fill="none" />
              <circle cx="100" cy="115" r="55" stroke="rgba(177, 143, 47, 0.15)" strokeWidth="1" fill="none" strokeDasharray="30 10" />

              {/* Robot Head */}
              <circle cx="100" cy="40" r="14" stroke="var(--accent)" strokeWidth="2" fill="none" />
              <line x1="92" y1="40" x2="108" y2="40" stroke="var(--warning)" strokeWidth="2" />
              
              {/* Neck */}
              <line x1="100" y1="54" x2="100" y2="62" stroke="var(--accent)" strokeWidth="2" />

              {/* Torso/Spine */}
              <path d="M100,62 L100,125" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              {/* Torso Segments */}
              <polygon points="85,67 115,67 110,95 90,95" stroke="var(--accent)" strokeWidth="2" fill="none" />
              <polygon points="90,98 110,98 106,120 94,120" stroke="var(--accent)" strokeWidth="1.5" fill="none" />

              {/* Shoulders */}
              <line x1="85" y1="67" x2="68" y2="70" stroke="var(--accent)" strokeWidth="2" />
              <line x1="115" y1="67" x2="132" y2="70" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="68" cy="70" r="4" fill="var(--warning)" />
              <circle cx="132" cy="70" r="4" fill="var(--warning)" />

              {/* Arms */}
              {/* Left Arm */}
              <line x1="68" y1="70" x2="58" y2="105" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="58" cy="105" r="3" fill="var(--accent)" />
              <line x1="58" y1="105" x2="52" y2="135" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx="52" cy="135" r="3.5" stroke="var(--warning)" strokeWidth="1" fill="none" />

              {/* Right Arm */}
              <line x1="132" y1="70" x2="142" y2="105" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="142" cy="105" r="3" fill="var(--accent)" />
              <line x1="142" y1="105" x2="148" y2="135" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx="148" cy="135" r="3.5" stroke="var(--warning)" strokeWidth="1" fill="none" />

              {/* Pelvis */}
              <line x1="86" y1="125" x2="114" y2="125" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="86" cy="125" r="4" fill="var(--warning)" />
              <circle cx="114" cy="125" r="4" fill="var(--warning)" />

              {/* Legs */}
              {/* Left Leg */}
              <line x1="86" y1="125" x2="82" y2="170" stroke="var(--accent)" strokeWidth="2.5" />
              <circle cx="82" cy="170" r="3.5" fill="var(--accent)" />
              <line x1="82" y1="170" x2="78" y2="215" stroke="var(--accent)" strokeWidth="2" />
              <line x1="78" y1="215" x2="68" y2="220" stroke="var(--accent)" strokeWidth="2.5" />

              {/* Right Leg */}
              <line x1="114" y1="125" x2="118" y2="170" stroke="var(--accent)" strokeWidth="2.5" />
              <circle cx="118" cy="170" r="3.5" fill="var(--accent)" />
              <line x1="118" y1="170" x2="122" y2="215" stroke="var(--accent)" strokeWidth="2" />
              <line x1="122" y1="215" x2="132" y2="220" stroke="var(--accent)" strokeWidth="2.5" />

              {/* Diagnostic labels */}
              <line x1="100" y1="26" x2="100" y2="10" stroke="rgba(74, 124, 89, 0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x="100" y="6" fontSize="5.5" fill="var(--accent)" textAnchor="middle" letterSpacing="0.5" fontFamily="monospace" fontWeight="bold">VISUAL_SENSORS: OK</text>

              <line x1="68" y1="70" x2="35" y2="70" stroke="rgba(74, 124, 89, 0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x="30" y="72" fontSize="5.5" fill="var(--accent)" textAnchor="end" letterSpacing="0.5" fontFamily="monospace" fontWeight="bold">ARM_SERVO_A1: ACTIVE</text>

              <line x1="132" y1="70" x2="165" y2="70" stroke="rgba(74, 124, 89, 0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x="170" y="72" fontSize="5.5" fill="var(--accent)" textAnchor="start" letterSpacing="0.5" fontFamily="monospace" fontWeight="bold">TEAL_V2_LINK: STABLE</text>

              <line x1="100" y1="81" x2="45" y2="81" stroke="rgba(177, 143, 47, 0.3)" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x="40" y="83" fontSize="5.5" fill="var(--warning)" textAnchor="end" letterSpacing="0.5" fontFamily="monospace" fontWeight="bold">CORE_GRID_LINK: 98%</text>
              <circle cx="100" cy="81" r="2.5" fill="var(--warning)" />

              {/* Sweeping Laser Line overlay */}
              <g className="laser-container">
                <line x1="5" y1="0" x2="195" y2="0" stroke="var(--accent)" strokeWidth="1.5" opacity="0.75" />
                <polygon points="5,-6 195,-6 195,6 5,6" fill="url(#laser-glow)" opacity="0.12" />
              </g>

              <defs>
                <linearGradient id="laser-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="1" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* In-SVG circular loader percentage */}
            <div className="hud-overlay">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle cx="50" cy="50" r="46" stroke="rgba(74, 124, 89, 0.08)" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="41" stroke="var(--accent)" strokeWidth="3" fill="none" strokeDasharray="75 180" className="hud-spinner" />
                <circle cx="50" cy="50" r="35" stroke="var(--warning)" strokeWidth="1.5" fill="none" strokeDasharray="20 40" className="hud-counter-spinner" />
                <text x="50" y="55" className="hud-percentage" textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontFamily="monospace" fontWeight="800">
                  {progress}%
                </text>
              </svg>
            </div>
          </div>
          <div className="center-status-text">
            INITIALIZING ATLAS ENVIRONMENT
            <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>

        {/* Right Side: Performance Gauges */}
        <div className="loader-panel loader-right">
          <div className="panel-header">
            <Activity className="panel-header-icon" />
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
                <span>Database Latency</span>
                <span className="gauge-value">{simulatedLatency} ms</span>
              </div>
              <div className="gauge-track">
                <div className="gauge-bar" style={{ width: `${(simulatedLatency / 25) * 100}%` }} />
              </div>
            </div>

            <div className="gauge-item">
              <div className="gauge-label">
                <span>Ingest Stream Rate</span>
                <span className="gauge-value">{simulatedIngest} kb/s</span>
              </div>
              <div className="gauge-track">
                <div className="gauge-bar gauge-bar-warning" style={{ width: `${(parseFloat(simulatedIngest) / 6) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="wave-container">
            <div className="gauge-label" style={{ marginBottom: "4px" }}>
              <span>Frequency Modulator</span>
            </div>
            <svg viewBox="0 0 100 24" width="100%" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,12 L15,12 L20,3 L25,21 L30,12 L45,12 L50,1 L55,23 L60,12 L75,12 L80,5 L85,19 L90,12 L100,12" stroke="var(--accent)" strokeWidth="1.2" className="telemetry-wave" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Row: Console Terminal logs */}
      <div className="loader-console-container">
        <div className="loader-console-header">
          <div className="flex items-center gap-1.5" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Terminal className="size-3.5" style={{ color: "var(--warning)" }} />
            <span>Diagnostics Console Logs</span>
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "9px" }}>ELAPSED: {(elapsedTime / 10).toFixed(1)}s</span>
        </div>
        <div className="loader-console">
          {logs.map((log, index) => {
            const isSystem = log.startsWith("SYSTEM:");
            const isDatabase = log.startsWith("DATABASE:");
            const isSuccess = log.includes("success") || log.includes("complete") || log.includes("OK") || log.includes("Operational");
            
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
  );
}

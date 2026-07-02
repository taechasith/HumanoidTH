"use client";

import Script from "next/script";

export default function RobotViewer() {
  return (
    <>
      <Script 
        type="module" 
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" 
        strategy="afterInteractive"
      />
      <div className="panel" style={{ height: "460px", display: "flex", flexDirection: "column" }}>
        <h2>Hardware Node: TEAL v2</h2>
        <p className="muted" style={{ fontSize: "12px", marginBottom: "10px" }}>
          Interactive 3D embodiment view of: <code>teal_v.2.glb</code>
        </p>
        <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", minHeight: "280px" }}>
          {/* @ts-ignore */}
          <model-viewer
            src="/teal_v.2.glb"
            autoplay
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{ width: "100%", height: "100%", background: "#f8faf8", borderRadius: "8px", border: "1px solid var(--border)" }}
          />
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
          Drag model to orbit. Scroll/pinch to zoom. Embodiment kinematics animation plays on active loop.
        </div>
      </div>
    </>
  );
}

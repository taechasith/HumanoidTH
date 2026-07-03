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
      <div className="robot-viewer-frame">
        {/* @ts-ignore */}
        <model-viewer
          src="/teal_v.2.glb"
          camera-controls
          shadow-intensity="1.5"
          style={{ width: "100%", height: "120%", background: "transparent" }}
          camera-orbit="0deg 84deg 42%"
          camera-target="0m 0.92m 0m"
          field-of-view="26deg"
          exposure="1.05"
          shadow-softness="0.9"
        />
      </div>
    </>
  );
}

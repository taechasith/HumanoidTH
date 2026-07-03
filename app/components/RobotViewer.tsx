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
      {/* @ts-ignore */}
      <model-viewer
        src="/teal_v.2.glb"
        camera-controls
        shadow-intensity="1.5"
        style={{ width: "100%", height: "100%", background: "transparent" }}
        camera-orbit="0deg 75deg 32%"
      />
    </>
  );
}

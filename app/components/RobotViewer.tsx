"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const headNodeNames = [
  "Head_06",
  "Head.001_07",
  "Head.002_08",
  "Eye Control.L_010",
  "Eye Control.R_019"
];

type VectorLike = { x: number; y: number; z: number; set?: (x: number, y: number, z: number) => void };
type SceneNodeLike = {
  rotation?: VectorLike | number[] | string;
  object3D?: { rotation?: VectorLike };
  threeObject?: { rotation?: VectorLike };
};

export default function RobotViewer() {
  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current as any;
    if (!viewer) return;

    let animationFrame = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let currentYaw = 0;
    let currentPitch = 0;
    let nodes: SceneNodeLike[] = [];

    const readRotation = (node: SceneNodeLike) => {
      const rotation = node.object3D?.rotation || node.threeObject?.rotation || node.rotation;
      if (rotation && typeof rotation === "object" && !Array.isArray(rotation)) {
        return { x: rotation.x || 0, y: rotation.y || 0, z: rotation.z || 0 };
      }
      if (Array.isArray(rotation)) {
        return { x: rotation[0] || 0, y: rotation[1] || 0, z: rotation[2] || 0 };
      }
      return { x: 0, y: 0, z: 0 };
    };

    const applyRotation = (node: SceneNodeLike, pitch: number, yaw: number) => {
      const rotation = node.object3D?.rotation || node.threeObject?.rotation || node.rotation;
      const base = baseRotations.get(node) || readRotation(node);

      if (rotation && typeof rotation === "object" && !Array.isArray(rotation)) {
        if (typeof rotation.set === "function") {
          rotation.set(base.x + pitch, base.y + yaw, base.z);
        } else {
          rotation.x = base.x + pitch;
          rotation.y = base.y + yaw;
          rotation.z = base.z;
        }
        return;
      }

      if (Array.isArray(rotation)) {
        rotation[0] = base.x + pitch;
        rotation[1] = base.y + yaw;
        rotation[2] = base.z;
      }
    };

    const baseRotations = new WeakMap<SceneNodeLike, { x: number; y: number; z: number }>();

    const collectNodes = () => {
      const model = viewer.model;
      nodes = headNodeNames
        .map((name) => model?.getNode?.(name))
        .filter(Boolean);

      for (const node of nodes) {
        if (!baseRotations.has(node)) {
          baseRotations.set(node, readRotation(node));
        }
      }
    };

    const updateFromPointer = (event: PointerEvent) => {
      const rect = viewer.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      targetYaw = Math.max(-0.24, Math.min(0.24, x * 0.24));
      targetPitch = Math.max(-0.16, Math.min(0.16, y * -0.16));
    };

    const resetTarget = () => {
      targetYaw = 0;
      targetPitch = 0;
    };

    const animate = () => {
      currentYaw += (targetYaw - currentYaw) * 0.12;
      currentPitch += (targetPitch - currentPitch) * 0.12;

      for (const node of nodes) {
        applyRotation(node, currentPitch, currentYaw);
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const onLoad = () => {
      collectNodes();
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("pointermove", updateFromPointer);
    viewer.addEventListener("pointerleave", resetTarget);

    if (viewer.model) onLoad();

    return () => {
      viewer.removeEventListener("load", onLoad);
      viewer.removeEventListener("pointermove", updateFromPointer);
      viewer.removeEventListener("pointerleave", resetTarget);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

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
          ref={viewerRef}
          src="/teal_v.2.glb"
          camera-controls
          disable-pan
          disable-zoom
          interaction-prompt="none"
          shadow-intensity="1.5"
          min-camera-orbit="-180deg 78deg 42%"
          max-camera-orbit="180deg 90deg 42%"
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

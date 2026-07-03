"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const headNodeName = "Head_06";
const eyeNodeNames = ["Eye Control.L_010", "Eye Control.R_019"];

type RotationBase = {
  x: number;
  y: number;
  z: number;
};

export default function RobotViewer() {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const scene = new Scene();
    scene.background = null;

    const camera = new PerspectiveCamera(26, 1, 0.01, 100);
    camera.position.set(0, 0.35, 5.15);
    camera.lookAt(0, 0.15, 0);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(new Color(0xffffff), 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute("aria-label", "Interactive humanoid robot model");
    frame.appendChild(renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(2.8, 4, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new DirectionalLight(0x7fffd0, 1.5);
    fillLight.position.set(-3, 2, 2.5);
    scene.add(fillLight);

    const rimLight = new DirectionalLight(0xd9fff0, 2.1);
    rimLight.position.set(0, 3.2, -3);
    scene.add(rimLight);

    const robotRoot = new Group();
    robotRoot.position.y = -0.78;
    scene.add(robotRoot);

    const pointer = new Vector2(0, 0);
    const targetHead = new Vector2(0, 0);
    const currentHead = new Vector2(0, 0);
    const baseRotations = new WeakMap<Object3D, RotationBase>();
    const activeHeadNodes: Object3D[] = [];
    const activeEyeNodes: Object3D[] = [];

    let disposed = false;
    let dragging = false;
    let lastClientX = 0;
    let targetRootYaw = 0;
    let currentRootYaw = 0;
    let animationFrame = 0;

    const resize = () => {
      const width = frame.clientWidth || 1;
      const height = frame.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    resize();

    const saveBaseRotation = (node: Object3D) => {
      if (baseRotations.has(node)) return;
      baseRotations.set(node, {
        x: node.rotation.x,
        y: node.rotation.y,
        z: node.rotation.z
      });
    };

    const fitModelToStage = (model: Object3D) => {
      const box = new Box3().setFromObject(model);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);

      const scale = size.y > 0 ? 2.82 / size.y : 1;
      model.scale.setScalar(scale);

      const scaledCenter = center.multiplyScalar(scale);
      model.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);
    };

    const loader = new GLTFLoader();
    loader.load("/teal_v.2.glb", (gltf) => {
      if (disposed) return;

      const model = gltf.scene;
      model.traverse((child) => {
        child.frustumCulled = false;
        saveBaseRotation(child);

        if ((child as any).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }

        if (child.name === headNodeName) {
          activeHeadNodes.push(child);
        }

        if (eyeNodeNames.includes(child.name)) {
          activeEyeNodes.push(child);
        }
      });

      fitModelToStage(model);
      robotRoot.add(model);
    });

    const updatePointerTarget = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      pointer.set(
        MathUtils.clamp(x, -1, 1),
        MathUtils.clamp(y, -1, 1)
      );

      targetHead.set(pointer.x * 0.38, pointer.y * -0.26);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastClientX = event.clientX;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(event.pointerId);
      updatePointerTarget(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointerTarget(event);

      if (!dragging) return;
      const deltaX = event.clientX - lastClientX;
      lastClientX = event.clientX;
      targetRootYaw += deltaX * 0.008;
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerLeave = () => {
      targetHead.set(0, 0);
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const clock = new Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      currentRootYaw += (targetRootYaw - currentRootYaw) * 0.12;
      currentHead.lerp(targetHead, 0.13);

      robotRoot.rotation.y = currentRootYaw;

      for (const node of activeHeadNodes) {
        const base = baseRotations.get(node);
        if (!base) continue;
        node.rotation.x = base.x + currentHead.y;
        node.rotation.y = base.y + currentHead.x;
        node.rotation.z = base.z + Math.sin(elapsed * 1.2) * 0.01;
      }

      for (const node of activeEyeNodes) {
        const base = baseRotations.get(node);
        if (!base) continue;
        node.rotation.x = base.x + currentHead.y * 0.45;
        node.rotation.y = base.y + currentHead.x * 0.55;
        node.rotation.z = base.z;
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.dispose();
      frame.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={frameRef} className="robot-viewer-frame" />;
}

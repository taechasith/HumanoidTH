// Browser-only pose sensing for the Living Lab. Runs on-device: frames are never uploaded or stored.
// Model and WASM files are served from /public/mediapipe so the camera works without internet.
import type { Landmark } from "@/lib/hri/signals";

// people: how many bodies are in view (up to 2, enough to tell "more than one").
// luma: mean brightness 0–255 of a tiny downscaled frame, refreshed about once a second (undefined until first sample).
export type PoseFrame = { tMs: number; landmarks: Landmark[] | null; fps: number; people: number; luma?: number };

// Mean brightness of the current video frame from a 64×48 sample. Pixels never leave this function.
function makeLumaSampler() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return (video: HTMLVideoElement) => {
    if (!ctx || !video.videoWidth) return undefined;
    ctx.drawImage(video, 0, 0, 64, 48);
    const data = ctx.getImageData(0, 0, 64, 48).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return sum / (data.length / 4);
  };
}

// isCancelled lets a caller abandon a start that is still loading: the camera is then never requested,
// or is released straight away, and the returned stop function does nothing.
export async function startPoseCamera(
  video: HTMLVideoElement,
  onFrame: (frame: PoseFrame) => void,
  isCancelled: () => boolean = () => false
) {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate },
      runningMode: "VIDEO",
      // Two, so Auto mode can tell when more than one person is in front of the robot.
      // Callers that only want one person keep using `landmarks` (the first pose).
      numPoses: 2
    });
  let landmarker;
  try {
    landmarker = await create("GPU");
  } catch {
    landmarker = await create("CPU");
  }

  if (isCancelled()) {
    landmarker.close();
    return () => undefined;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
  if (isCancelled()) {
    stream.getTracks().forEach((track) => track.stop());
    landmarker.close();
    return () => undefined;
  }
  video.srcObject = stream;
  await video.play();

  let running = true;
  let fps = 0;
  let last = performance.now();
  const sampleLuma = makeLumaSampler();
  let luma: number | undefined;
  let lastLuma = -Infinity;
  const loop = () => {
    if (!running) return;
    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    fps = fps * 0.9 + (1000 / Math.max(1, now - last)) * 0.1;
    last = now;
    if (now - lastLuma > 1000) {
      luma = sampleLuma(video);
      lastLuma = now;
    }
    onFrame({
      tMs: now,
      landmarks: (result.landmarks?.[0] as Landmark[] | undefined) ?? null,
      fps,
      people: result.landmarks?.length ?? 0,
      luma
    });
    if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(loop);
    else requestAnimationFrame(loop);
  };
  loop();

  return () => {
    running = false;
    stream.getTracks().forEach((track) => track.stop());
    landmarker.close();
  };
}

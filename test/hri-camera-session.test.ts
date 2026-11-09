import assert from "node:assert/strict";
import { test } from "node:test";
import { CameraSession, type StopCamera } from "../lib/hri/camera-session";

// A camera whose loading finishes only when the test says so.
function pendingCamera() {
  let stops = 0;
  let cancelled: () => boolean = () => false;
  let finish!: (stop: StopCamera) => void;
  let fail!: (error: Error) => void;
  const opened = new Promise<StopCamera>((resolve, reject) => { finish = resolve; fail = reject; });
  return {
    open: (isCancelled: () => boolean) => { cancelled = isCancelled; return opened; },
    load: () => finish(() => { stops++; }),
    fail: (error: Error) => fail(error),
    isCancelled: () => cancelled(),
    stops: () => stops
  };
}

test("camera: starts live and stop() releases it once", async () => {
  const session = new CameraSession();
  const cam = pendingCamera();
  const started = session.start(cam.open);
  cam.load();
  assert.equal(await started, true);
  assert.equal(cam.stops(), 0);
  session.stop();
  session.stop();
  assert.equal(cam.stops(), 1);
});

test("camera: stopping while it loads (consent revoked) releases it as soon as it opens", async () => {
  const session = new CameraSession();
  const cam = pendingCamera();
  const started = session.start(cam.open);
  assert.equal(cam.isCancelled(), false);
  session.stop();
  assert.equal(cam.isCancelled(), true, "the loader can abandon before requesting the camera");
  cam.load();
  assert.equal(await started, false, "a cancelled start never reports the camera as on");
  assert.equal(cam.stops(), 1, "the camera is not left running");
});

test("camera: a failure after stopping is not reported as an error", async () => {
  const session = new CameraSession();
  const cam = pendingCamera();
  const started = session.start(cam.open);
  session.stop();
  cam.fail(new Error("permission dismissed"));
  assert.equal(await started, false);
});

test("camera: a failure while still wanted reaches the caller", async () => {
  const session = new CameraSession();
  const cam = pendingCamera();
  const started = session.start(cam.open);
  cam.fail(new Error("no camera"));
  await assert.rejects(started, /no camera/);
});

test("camera: a stale start cannot take over from a newer one", async () => {
  const session = new CameraSession();
  const first = pendingCamera();
  const second = pendingCamera();
  const startedFirst = session.start(first.open);
  session.stop();
  const startedSecond = session.start(second.open);
  second.load();
  assert.equal(await startedSecond, true);
  first.load();
  assert.equal(await startedFirst, false);
  assert.equal(first.stops(), 1);
  assert.equal(second.stops(), 0, "the newer camera keeps running");
  session.stop();
  assert.equal(second.stops(), 1);
});

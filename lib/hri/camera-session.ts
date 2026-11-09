// Tracks one camera start at a time, so stopping always wins, even while the camera is still loading.
// Starting takes seconds (model download, permission prompt), and consent can be revoked meanwhile.

export type StopCamera = () => void;
export type OpenCamera = (isCancelled: () => boolean) => Promise<StopCamera>;

export class CameraSession {
  private run = 0;
  private stopLive: StopCamera | null = null;

  // Resolves true when the camera is live, false when stop() was called while it was loading.
  // Rejects only if opening fails for a start that is still wanted.
  async start(open: OpenCamera): Promise<boolean> {
    this.stop();
    const run = this.run;
    const cancelled = () => run !== this.run;
    let stopOpened: StopCamera;
    try {
      stopOpened = await open(cancelled);
    } catch (error) {
      if (cancelled()) return false;
      throw error;
    }
    if (cancelled()) {
      stopOpened();
      return false;
    }
    this.stopLive = stopOpened;
    return true;
  }

  stop() {
    this.run++;
    this.stopLive?.();
    this.stopLive = null;
  }
}

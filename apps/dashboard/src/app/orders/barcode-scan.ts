// The browser's own QR reader (Shape Detection API, Chrome on Android and some desktops). No package:
// where the browser has none, Find order hides its Scan button.

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

/** The reader when this browser has it, or null (feature detection, never a broken button). */
export function barcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.BarcodeDetector ?? null;
}

const SCAN_EVERY_MS = 300;

/**
 * Opens the back camera in `video` and reads QR codes until one is found or `signal` aborts.
 * Resolves with the QR's text; rejects when the camera is blocked or missing.
 */
export async function scanQr(video: HTMLVideoElement, signal: AbortSignal): Promise<string | null> {
  const Detector = barcodeDetector();
  if (!Detector) return null;
  const detector = new Detector({ formats: ['qr_code'] });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  try {
    video.srcObject = stream;
    await video.play();
    while (!signal.aborted) {
      const found = await detector.detect(video).catch(() => []);
      const value = found[0]?.rawValue;
      if (value) return value;
      await new Promise((resolve) => window.setTimeout(resolve, SCAN_EVERY_MS));
    }
    return null;
  } finally {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  }
}

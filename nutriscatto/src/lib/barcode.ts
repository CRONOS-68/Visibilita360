import { loadImage } from './image';

/*
 * Lettura codici a barre (EAN/UPC dei prodotti alimentari).
 * Usa il BarcodeDetector nativo quando c'è (Chrome su Android), altrimenti ZXing
 * (iPhone/Safari, Firefox), caricato solo quando serve.
 */

interface DetectedBarcode {
  rawValue: string;
}
interface NativeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
interface NativeDetectorCtor {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

async function nativeDetector(): Promise<NativeDetector | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported = await Ctor.getSupportedFormats();
    const formats = FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new Ctor({ formats }) : null;
  } catch {
    return null;
  }
}

async function zxingReader(tryHarder: boolean) {
  const [{ BrowserMultiFormatOneDReader }, { DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map();
  if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 150 });
}

/** Legge il codice da una foto (fallback che funziona anche senza HTTPS). */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const img = await loadImage(file);
  const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);

  const native = await nativeDetector();
  if (native) {
    try {
      const found = await native.detect(canvas);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {
      /* ripiega su ZXing */
    }
  }
  try {
    const reader = await zxingReader(true);
    return reader.decodeFromCanvas(canvas).getText();
  } catch {
    return null;
  }
}

export function cameraAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
}

export interface LiveScan {
  stop(): void;
}

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
};

/** Avvia la fotocamera posteriore nel <video> e chiama onCode alla prima lettura valida. */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<LiveScan> {
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  const native = await nativeDetector();

  if (native) {
    const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    video.srcObject = stream;
    await video.play();
    let stopped = false;
    const stop = () => {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    const tick = async () => {
      if (stopped) return;
      try {
        if (video.readyState >= 2) {
          const found = await native.detect(video);
          if (found[0]?.rawValue && !stopped) {
            stop();
            onCode(found[0].rawValue);
            return;
          }
        }
      } catch {
        /* frame non leggibile */
      }
      setTimeout(tick, 180);
    };
    tick();
    return { stop };
  }

  const reader = await zxingReader(false);
  let done = false;
  const controls = await reader.decodeFromConstraints(CONSTRAINTS, video, (result, _err, ctrl) => {
    if (result && !done) {
      done = true;
      ctrl.stop();
      onCode(result.getText());
    }
  });
  return {
    stop: () => {
      done = true;
      controls.stop();
    },
  };
}

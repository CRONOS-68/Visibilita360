export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile leggere la foto'));
    };
    img.src = url;
  });
}

/** Ridimensiona (il lato lungo al massimo `maxSide` px) e ricomprime in JPEG. */
export function toJpeg(img: HTMLImageElement, maxSide: number, quality: number): string {
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export interface PreparedPhoto {
  /** JPEG in base64 senza prefisso, pronto per l'analisi. */
  base64: string;
  /** Anteprima grande per la schermata di conferma. */
  preview: string;
  /** Miniatura da salvare nel diario. */
  thumb: string;
}

export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  const img = await loadImage(file);
  // 1568 px sul lato lungo: oltre, il modello ridimensiona comunque e si pagano token inutili.
  const preview = toJpeg(img, 1568, 0.85);
  return {
    base64: preview.slice(preview.indexOf(',') + 1),
    preview,
    thumb: toJpeg(img, 192, 0.7),
  };
}

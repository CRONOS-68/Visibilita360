import { useEffect, useRef, useState } from 'react';
import { cameraAvailable, decodeImageFile, startLiveScan, type LiveScan } from '../lib/barcode';
import { Icon } from './Icon';

export function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(cameraAvailable() ? null : 'La scansione live richiede HTTPS: usa "Foto del codice" o digita il numero.');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cameraAvailable() || !videoRef.current) return;
    let scan: LiveScan | null = null;
    let cancelled = false;
    startLiveScan(videoRef.current, (code) => {
      if (navigator.vibrate) navigator.vibrate(60);
      onCode(code);
    })
      .then((s) => {
        if (cancelled) s.stop();
        else scan = s;
      })
      .catch((e: Error) => {
        setError(
          e.name === 'NotAllowedError'
            ? 'Permesso fotocamera negato: abilitalo nelle impostazioni del browser.'
            : 'Fotocamera non disponibile. Usa "Foto del codice" o digita il numero.',
        );
      });
    return () => {
      cancelled = true;
      scan?.stop();
    };
  }, [onCode]);

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const code = await decodeImageFile(file).catch(() => null);
    setBusy(false);
    if (code) onCode(code);
    else setError('Codice non leggibile nella foto: avvicinati e tienilo dritto e ben illuminato.');
  };

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scansione codice a barre">
      <video ref={videoRef} playsInline muted />
      <div className="scanner-frame" />
      <div className="scanner-top">
        <span>Inquadra il codice a barre</span>
        <button type="button" className="icon-btn" aria-label="Chiudi" onClick={onClose} style={{ background: 'rgba(0,0,0,.4)', color: '#fff' }}>
          <Icon name="close" />
        </button>
      </div>
      <div className="scanner-bar">
        {error && <p className="small">{error}</p>}
        <button type="button" className="btn block" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Icon name="camera" size={18} /> {busy ? 'Lettura…' : 'Foto del codice'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            fromPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = manual.replace(/\D/g, '');
            if (clean.length >= 8) onCode(clean);
          }}
        >
          <input
            className="input grow"
            inputMode="numeric"
            placeholder="oppure digita il numero (EAN)"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            style={{ background: '#222', color: '#fff', borderColor: '#333' }}
          />
          <button type="submit" className="btn primary" disabled={manual.replace(/\D/g, '').length < 8}>
            Cerca
          </button>
        </form>
      </div>
    </div>
  );
}

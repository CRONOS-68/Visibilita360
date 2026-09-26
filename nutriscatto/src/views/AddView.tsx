import { useCallback, useMemo, useRef, useState } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Icon } from '../components/Icon';
import { blankItem, repeatMeal } from '../components/MealEditor';
import { AiError, analyzePhoto, type AnalyzeMode } from '../lib/ai';
import { formatDay, dateKey } from '../lib/dates';
import { preparePhoto, type PreparedPhoto } from '../lib/image';
import { mealNutrients, uid } from '../lib/nutrition';
import { fetchProduct } from '../lib/openfoodfacts';
import type { Meal } from '../lib/types';

export interface EditorRequest {
  meal: Meal;
  notes?: string;
  preview?: string;
  openFirstItem?: boolean;
}

function newMeal(partial: Partial<Meal>): Meal {
  return { id: uid(), eatenAt: new Date().toISOString(), name: '', source: 'manuale', items: [], walkAfter: false, ...partial };
}

type Stage =
  | { kind: 'menu'; message?: { tone: 'error' | 'warn'; text: string; labelCta?: boolean } }
  | { kind: 'photo'; mode: AnalyzeMode; photo: PreparedPhoto; hint: string; busy: boolean; error?: string }
  | { kind: 'scan' }
  | { kind: 'lookup'; code: string };

export function AddView({
  meals,
  token,
  onOpenEditor,
}: {
  meals: Meal[];
  token: string;
  onOpenEditor: (req: EditorRequest) => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'menu' });
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<AnalyzeMode>('piatto');
  const pendingHint = useRef('');

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Meal[] = [];
    for (const m of [...meals].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))) {
      const key = m.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(m);
      if (out.length >= 8) break;
    }
    return out;
  }, [meals]);

  const pick = (mode: AnalyzeMode, source: 'camera' | 'gallery', hint = '') => {
    pendingMode.current = mode;
    pendingHint.current = hint;
    (source === 'camera' ? cameraRef : galleryRef).current?.click();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const photo = await preparePhoto(file);
      setStage({ kind: 'photo', mode: pendingMode.current, photo, hint: pendingHint.current, busy: false });
    } catch (e) {
      setStage({ kind: 'menu', message: { tone: 'error', text: (e as Error).message } });
    }
  };

  const analyze = async () => {
    if (stage.kind !== 'photo') return;
    setStage({ ...stage, busy: true, error: undefined });
    try {
      const res = await analyzePhoto(stage.photo.base64, stage.mode, stage.hint, token);
      if (!res.isFood) {
        setStage({ ...stage, busy: false, error: res.notes || 'Nella foto non riconosco cibo o un’etichetta. Riprova.' });
        return;
      }
      onOpenEditor({
        meal: newMeal({
          name: res.dishName || res.items[0]?.name || '',
          source: stage.mode === 'etichetta' ? 'etichetta' : 'foto',
          items: res.items,
          thumb: stage.photo.thumb,
        }),
        notes: res.notes,
        preview: stage.photo.preview,
      });
      setStage({ kind: 'menu' });
    } catch (e) {
      setStage({ ...stage, busy: false, error: e instanceof AiError ? e.message : 'Analisi non riuscita, riprova.' });
    }
  };

  const onCode = useCallback(
    async (code: string) => {
      setStage({ kind: 'lookup', code });
      try {
        const p = await fetchProduct(code);
        if (!p || !p.hasNutrition) {
          setStage({
            kind: 'menu',
            message: {
              tone: 'warn',
              text: p
                ? `"${p.name}" è nel database ma senza valori nutrizionali. Fotografa la tabella sulla confezione.`
                : `Prodotto ${code} non trovato su Open Food Facts. Fotografa la tabella nutrizionale sulla confezione.`,
              labelCta: true,
            },
          });
          pendingHint.current = p ? p.name : '';
          return;
        }
        const name = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} (${p.brand})` : p.name;
        onOpenEditor({
          meal: newMeal({
            name,
            source: 'barcode',
            items: [{ id: uid(), name, brand: p.brand, barcode: p.code, grams: p.servingGrams ?? 100, per100: p.per100, gi: p.gi }],
          }),
          notes: p.servingGrams
            ? `Porzione suggerita dalla confezione: ${p.servingGrams} g. Regola i grammi su quanto hai mangiato.`
            : 'Indica quanti grammi hai mangiato.',
        });
        setStage({ kind: 'menu' });
      } catch (e) {
        setStage({ kind: 'menu', message: { tone: 'error', text: (e as Error).message } });
      }
    },
    [onOpenEditor],
  );

  const closeScanner = useCallback(() => setStage({ kind: 'menu' }), []);

  const fileInputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );

  if (stage.kind === 'photo') {
    const isLabel = stage.mode === 'etichetta';
    return (
      <div className="stack">
        {fileInputs}
        <div className="card stack">
          <div className="row between">
            <h2>{isLabel ? 'Etichetta nutrizionale' : 'Foto del piatto'}</h2>
            <button type="button" className="icon-btn plain" aria-label="Annulla" onClick={() => setStage({ kind: 'menu' })}>
              <Icon name="close" />
            </button>
          </div>
          <img className="photo-preview" src={stage.photo.preview} alt="Foto scattata" />
          <label className="field">
            {isLabel ? 'Nome del prodotto (facoltativo)' : 'Dettagli che aiutano la stima (facoltativo)'}
            <textarea
              className="input"
              value={stage.hint}
              disabled={stage.busy}
              placeholder={
                isLabel ? 'Es. Yogurt greco 0%' : 'Es. piatto fondo, circa 80 g di pasta a crudo, un cucchiaio d’olio'
              }
              onChange={(e) => setStage({ ...stage, hint: e.target.value })}
            />
          </label>
          {stage.error && (
            <div className="notice error">
              <Icon name="alert" size={18} />
              <span>{stage.error}</span>
            </div>
          )}
          {stage.busy ? (
            <div className="stack center" style={{ padding: '8px 0' }}>
              <div className="spinner" />
              <p className="small ink2">{isLabel ? 'Leggo i valori…' : 'Riconosco gli alimenti e stimo le quantità…'}</p>
            </div>
          ) : (
            <div className="row">
              <button type="button" className="btn" onClick={() => pick(stage.mode, 'camera', stage.hint)}>
                <Icon name="camera" size={18} /> Rifai
              </button>
              <button type="button" className="btn primary grow" onClick={analyze}>
                <Icon name="sparkle" size={18} /> Analizza
              </button>
            </div>
          )}
        </div>
        {!isLabel && (
          <p className="xsmall muted">
            Consiglio: scatta dall’alto a circa 45°, con tutto il piatto e una posata nell’inquadratura: aiutano a stimare le quantità.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      {fileInputs}
      {stage.kind === 'scan' && <BarcodeScanner onCode={onCode} onClose={closeScanner} />}
      {stage.kind === 'lookup' && (
        <div className="card stack center">
          <div className="spinner" />
          <p className="small ink2">Cerco il prodotto {stage.code}…</p>
        </div>
      )}
      {stage.kind === 'menu' && stage.message && (
        <div className={`notice ${stage.message.tone}`}>
          <Icon name={stage.message.tone === 'error' ? 'alert' : 'info'} size={18} />
          <div className="stack" style={{ gap: 8 }}>
            <span>{stage.message.text}</span>
            {stage.message.labelCta && (
              <div className="row wrap">
                <button type="button" className="btn sm primary" onClick={() => pick('etichetta', 'camera', pendingHint.current)}>
                  <Icon name="camera" size={16} /> Fotografa l’etichetta
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => onOpenEditor({ meal: newMeal({ items: [{ ...blankItem(), name: pendingHint.current }] }), openFirstItem: true })}
                >
                  Inserisci a mano
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="add-grid">
        <button type="button" className="add-tile hero" onClick={() => pick('piatto', 'camera')}>
          <span className="add-icon">
            <Icon name="camera" />
          </span>
          <span className="stack" style={{ gap: 2 }}>
            <strong>Fotografa il piatto</strong>
            <span className="desc">Riconosce i cibi e stima quantità, calorie, zuccheri, proteine e grassi</span>
          </span>
        </button>
        <button type="button" className="add-tile" onClick={() => setStage({ kind: 'scan' })}>
          <span className="add-icon">
            <Icon name="barcode" />
          </span>
          <strong>Codice a barre</strong>
          <span className="desc">Valori dalla banca dati Open Food Facts</span>
        </button>
        <button type="button" className="add-tile" onClick={() => pick('etichetta', 'camera')}>
          <span className="add-icon">
            <Icon name="label" />
          </span>
          <strong>Etichetta</strong>
          <span className="desc">Legge la tabella nutrizionale della confezione</span>
        </button>
        <button type="button" className="add-tile" onClick={() => pick('piatto', 'gallery')}>
          <span className="add-icon">
            <Icon name="image" />
          </span>
          <strong>Dalla galleria</strong>
          <span className="desc">Analizza una foto già scattata</span>
        </button>
        <button
          type="button"
          className="add-tile"
          onClick={() => onOpenEditor({ meal: newMeal({ items: [blankItem()] }), openFirstItem: true })}
        >
          <span className="add-icon">
            <Icon name="pencil" />
          </span>
          <strong>A mano</strong>
          <span className="desc">Inserisci grammi e valori</span>
        </button>
      </div>

      {recent.length > 0 && (
        <div className="card">
          <div className="section-title">
            <h2>Ripeti un pasto recente</h2>
            <Icon name="history" size={18} />
          </div>
          {recent.map((m) => {
            const n = mealNutrients(m);
            return (
              <button type="button" key={m.id} className="recent" onClick={() => onOpenEditor({ meal: repeatMeal(m) })}>
                {m.thumb ? (
                  <img className="meal-thumb" src={m.thumb} alt="" style={{ width: 40, height: 40 }} />
                ) : (
                  <span className="meal-thumb" style={{ width: 40, height: 40 }}>
                    <Icon name={m.source === 'barcode' ? 'barcode' : 'pencil'} size={18} />
                  </span>
                )}
                <span className="grow">
                  <span className="meal-title" style={{ display: 'block' }}>
                    {m.name}
                  </span>
                  <span className="xsmall muted">
                    {dateKey(m.eatenAt) === dateKey(new Date()) ? 'oggi' : formatDay(dateKey(m.eatenAt))}
                  </span>
                </span>
                <span className="meal-kcal num">{Math.round(n.kcal)} kcal</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

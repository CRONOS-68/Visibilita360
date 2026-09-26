import { useState } from 'react';
import { fromLocalInput, toLocalInput } from '../lib/dates';
import { estimateGI } from '../lib/gi';
import { fmt, itemGL, itemNutrients, mealGL, mealGLClass, mealNutrients, round, uid } from '../lib/nutrition';
import type { FoodItem, Meal, Nutrients } from '../lib/types';
import { Icon } from './Icon';
import { NumInput } from './NumInput';

export function blankItem(): FoodItem {
  return { id: uid(), name: '', grams: 100, per100: { kcal: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0 }, gi: 0 };
}

const FIELDS: { key: keyof Nutrients; label: string }[] = [
  { key: 'kcal', label: 'kcal' },
  { key: 'carbs', label: 'Carboidr. g' },
  { key: 'sugars', label: 'Zuccheri g' },
  { key: 'fiber', label: 'Fibre g' },
  { key: 'protein', label: 'Proteine g' },
  { key: 'fat', label: 'Grassi g' },
];

const GL_TONE = { basso: 'var(--good)', medio: 'var(--warning)', alto: 'var(--critical)' };

export function GLBadge({ gl }: { gl: number }) {
  const cls = mealGLClass(gl);
  return (
    <span className="badge" title="Carico glicemico">
      <span className="zone-dot" style={{ background: GL_TONE[cls] }} />
      CG {Math.round(gl)} · {cls}
    </span>
  );
}

function ItemEditor({
  item,
  onChange,
  onRemove,
  startOpen,
}: {
  item: FoodItem;
  onChange: (i: FoodItem) => void;
  onRemove: () => void;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [basis, setBasis] = useState<'100' | 'porzione'>('100');
  const [giManual, setGiManual] = useState(item.gi > 0);
  const n = itemNutrients(item);
  const stepG = item.grams >= 60 ? 10 : 5;

  const update = (patch: Partial<FoodItem>) => {
    const next = { ...item, ...patch };
    if (!giManual) next.gi = estimateGI(next.name, next.per100);
    onChange(next);
  };

  const shown = basis === '100' ? item.per100 : n;
  const setNutrient = (key: keyof Nutrients, v: number | null) => {
    const value = v ?? 0;
    const per100Value = basis === '100' ? value : item.grams > 0 ? (value * 100) / item.grams : 0;
    update({ per100: { ...item.per100, [key]: per100Value } });
  };

  return (
    <div className="item">
      <div className="row">
        <input
          className="input grow"
          value={item.name}
          placeholder="Nome alimento"
          aria-label="Nome alimento"
          onChange={(e) => update({ name: e.target.value })}
        />
        <button type="button" className="icon-btn plain" aria-label="Rimuovi alimento" onClick={onRemove}>
          <Icon name="trash" size={20} />
        </button>
      </div>
      <div className="row between wrap" style={{ marginTop: 10 }}>
        <div className="stepper">
          <button
            type="button"
            className="icon-btn"
            aria-label="Meno"
            onClick={() => update({ grams: Math.max(0, item.grams - stepG) })}
          >
            <Icon name="minus" size={18} />
          </button>
          <NumInput value={item.grams} digits={0} ariaLabel="Grammi" onChange={(v) => update({ grams: v ?? 0 })} />
          <button type="button" className="icon-btn" aria-label="Più" onClick={() => update({ grams: item.grams + stepG })}>
            <Icon name="plus" size={18} />
          </button>
          <span className="small ink2">g</span>
        </div>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => update({ grams: Math.round(item.grams / 2) })}>
            ½
          </button>
          <button type="button" className="btn sm" onClick={() => update({ grams: Math.round(item.grams * 1.5) })}>
            ×1,5
          </button>
        </div>
      </div>
      <p className="macro-line num" style={{ marginTop: 8 }}>
        <b style={{ color: 'var(--ink)' }}>{Math.round(n.kcal)} kcal</b> · carboidrati {fmt(n.carbs)} g (zuccheri {fmt(n.sugars)}) ·
        proteine {fmt(n.protein)} g · grassi {fmt(n.fat)} g · IG {item.gi || '—'} · CG {Math.round(itemGL(item))}
        {item.confidence && (
          <span className="badge" style={{ marginLeft: 6 }}>
            stima {item.confidence}
          </span>
        )}
      </p>
      <button type="button" className="btn ghost sm" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => setOpen(!open)}>
        <Icon name="pencil" size={16} /> {open ? 'Chiudi valori' : 'Modifica valori nutrizionali'}
      </button>
      {open && (
        <div>
          <div className="row between" style={{ marginTop: 6 }}>
            <span className="small ink2">Valori riferiti a</span>
            <div className="segmented" role="group" aria-label="Base dei valori">
              <button type="button" aria-pressed={basis === '100'} onClick={() => setBasis('100')}>
                100 g
              </button>
              <button type="button" aria-pressed={basis === 'porzione'} onClick={() => setBasis('porzione')}>
                porzione ({Math.round(item.grams)} g)
              </button>
            </div>
          </div>
          <div className="nutri-grid">
            {FIELDS.map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                <NumInput value={round(shown[f.key], 1)} onChange={(v) => setNutrient(f.key, v)} />
              </label>
            ))}
            <label className="field">
              IG (0-100)
              <NumInput
                value={item.gi}
                digits={0}
                onChange={(v) => {
                  setGiManual(true);
                  onChange({ ...item, gi: Math.min(110, v ?? 0) });
                }}
              />
            </label>
          </div>
          <p className="xsmall muted" style={{ marginTop: 8 }}>
            Carboidrati senza fibra, come nelle etichette europee. L'indice glicemico si stima dal nome se non lo modifichi.
          </p>
        </div>
      )}
    </div>
  );
}

export function MealEditor({
  initial,
  isNew,
  notes,
  preview,
  openFirstItem = false,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Meal;
  isNew: boolean;
  notes?: string;
  preview?: string;
  openFirstItem?: boolean;
  onSave: (m: Meal) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(initial);
  const totals = mealNutrients(meal);
  const gl = mealGL(meal);
  const valid = meal.items.length > 0 && meal.items.every((i) => i.name.trim() && i.grams > 0);

  const setItem = (id: string, next: FoodItem) => setMeal((m) => ({ ...m, items: m.items.map((i) => (i.id === id ? next : i)) }));
  const removeItem = (id: string) => setMeal((m) => ({ ...m, items: m.items.filter((i) => i.id !== id) }));

  const save = () => {
    const name = meal.name.trim() || meal.items.map((i) => i.name.trim()).join(', ');
    onSave({ ...meal, name, items: meal.items.map((i) => ({ ...i, name: i.name.trim() })) });
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={isNew ? 'Nuovo pasto' : 'Modifica pasto'}>
      <div className="sheet-inner stack">
        <div className="row between">
          <h2 style={{ fontSize: 20 }}>{isNew ? 'Controlla e salva' : 'Modifica pasto'}</h2>
          <button type="button" className="icon-btn plain" aria-label="Chiudi" onClick={onCancel}>
            <Icon name="close" />
          </button>
        </div>

        {preview && <img className="photo-preview" src={preview} alt="Foto del pasto" />}

        {notes && (
          <div className="notice">
            <Icon name="sparkle" size={18} />
            <span>{notes}</span>
          </div>
        )}

        <div className="card">
          <div className="totals num">
            <div>
              <b>{Math.round(totals.kcal)}</b>
              <span>kcal</span>
            </div>
            <div>
              <b>{Math.round(totals.sugars)}</b>
              <span>zuccheri g</span>
            </div>
            <div>
              <b>{Math.round(totals.protein)}</b>
              <span>proteine g</span>
            </div>
            <div>
              <b>{Math.round(totals.fat)}</b>
              <span>grassi g</span>
            </div>
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <span className="small ink2">Carboidrati {Math.round(totals.carbs)} g</span>
            <GLBadge gl={gl} />
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>Alimenti</h2>
            <span className="xsmall muted">regola i grammi se serve</span>
          </div>
          {meal.items.map((item, idx) => (
            <ItemEditor
              key={item.id}
              item={item}
              startOpen={openFirstItem && idx === 0}
              onChange={(next) => setItem(item.id, next)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
          <button
            type="button"
            className="btn block"
            style={{ marginTop: 12 }}
            onClick={() => setMeal((m) => ({ ...m, items: [...m.items, blankItem()] }))}
          >
            <Icon name="plus" size={18} /> Aggiungi alimento
          </button>
        </div>

        <div className="card stack">
          <label className="field">
            Nome del pasto
            <input
              className="input"
              value={meal.name}
              placeholder="Es. Pranzo, Pasta al pomodoro"
              onChange={(e) => setMeal({ ...meal, name: e.target.value })}
            />
          </label>
          <label className="field">
            Quando
            <input
              className="input"
              type="datetime-local"
              value={toLocalInput(meal.eatenAt)}
              onChange={(e) => e.target.value && setMeal({ ...meal, eatenAt: fromLocalInput(e.target.value).toISOString() })}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={meal.walkAfter} onChange={(e) => setMeal({ ...meal, walkAfter: e.target.checked })} />
            <span>
              Camminata di 10-15 minuti dopo il pasto
              <br />
              <span className="xsmall muted">riduce il picco glicemico stimato di circa il 30%</span>
            </span>
          </label>
        </div>

        {!isNew && onDelete && (
          <button type="button" className="btn danger block" onClick={onDelete}>
            <Icon name="trash" size={18} /> Elimina pasto
          </button>
        )}
      </div>
      <div className="sheet-footer">
        <div>
          <button type="button" className="btn" onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className="btn primary grow" disabled={!valid} onClick={save}>
            <Icon name="check" size={18} /> Salva · {Math.round(totals.kcal)} kcal
          </button>
        </div>
      </div>
    </div>
  );
}

/** Copia di un pasto con nuovi id, per ripeterlo adesso. */
export function repeatMeal(meal: Meal): Meal {
  return {
    ...meal,
    id: uid(),
    eatenAt: new Date().toISOString(),
    walkAfter: false,
    thumb: meal.thumb,
    items: meal.items.map((i) => ({ ...i, id: uid() })),
  };
}

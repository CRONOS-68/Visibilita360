import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { NumInput } from '../components/NumInput';
import { serverHealth, type ServerHealth } from '../lib/ai';
import { exportBackup, readBackup } from '../lib/storage';
import type { AppState, Settings, Sex } from '../lib/types';
import { ACTIVITY_LEVELS } from '../lib/weight';

export function SettingsView({
  state,
  onChange,
  onImport,
  onReset,
}: {
  state: AppState;
  onChange: (patch: Partial<Settings>) => void;
  onImport: (s: AppState) => void;
  onReset: () => void;
}) {
  const { settings } = state;
  const [health, setHealth] = useState<ServerHealth | null | 'loading'>('loading');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    serverHealth().then(setHealth);
  }, []);

  const profile = settings.profile;
  const setProfile = (patch: Partial<Settings['profile']>) => onChange({ profile: { ...profile, ...patch } });

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Obiettivi</h2>
        <div className="grid-2">
          <label className="field">
            Calorie massime/giorno
            <NumInput value={settings.kcalMax} digits={0} onChange={(v) => v && v >= 800 && onChange({ kcalMax: Math.round(v) })} />
          </label>
          <label className="field">
            Kg da perdere
            <NumInput value={settings.weightLossGoal} onChange={(v) => v != null && v > 0 && onChange({ weightLossGoal: v })} />
          </label>
          <label className="field">
            Glicemia a digiuno iniziale
            <NumInput value={settings.fastingGlucose} digits={0} onChange={(v) => v && v >= 50 && onChange({ fastingGlucose: Math.round(v) })} />
          </label>
          <label className="field">
            Glicemia obiettivo
            <NumInput value={settings.targetGlucose} digits={0} onChange={(v) => v && v >= 60 && onChange({ targetGlucose: Math.round(v) })} />
          </label>
          <label className="field">
            Peso di partenza (kg)
            <NumInput value={settings.startWeight} onChange={(v) => onChange({ startWeight: v && v >= 30 ? v : null })} />
          </label>
        </div>
        <p className="xsmall muted">
          Tachimetro: verde fino a {settings.kcalMax - 400}, giallo fino a {settings.kcalMax - 200}, arancio fino a {settings.kcalMax}, rosso
          oltre.
        </p>
      </section>

      <section className="card stack">
        <h2>Profilo</h2>
        <p className="small ink2">Serve a stimare il consumo giornaliero e i tempi per l’obiettivo di peso.</p>
        <div className="grid-3">
          <label className="field">
            Sesso
            <select className="input" value={profile.sex} onChange={(e) => setProfile({ sex: e.target.value as Sex })}>
              <option value="">—</option>
              <option value="F">Donna</option>
              <option value="M">Uomo</option>
            </select>
          </label>
          <label className="field">
            Età
            <NumInput value={profile.age} digits={0} onChange={(v) => setProfile({ age: v && v >= 14 && v <= 110 ? Math.round(v) : null })} />
          </label>
          <label className="field">
            Altezza cm
            <NumInput
              value={profile.heightCm}
              digits={0}
              onChange={(v) => setProfile({ heightCm: v && v >= 120 && v <= 230 ? Math.round(v) : null })}
            />
          </label>
        </div>
        <label className="field">
          Attività fisica
          <select className="input" value={profile.activity} onChange={(e) => setProfile({ activity: Number(e.target.value) })}>
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card stack">
        <h2>Analisi delle foto</h2>
        {health === 'loading' ? (
          <p className="small muted">Verifico il server…</p>
        ) : health == null ? (
          <div className="notice error">
            <Icon name="alert" size={18} />
            <span>Server non raggiungibile: foto ed etichette non funzionano, codice a barre e inserimento manuale sì.</span>
          </div>
        ) : !health.ai ? (
          <div className="notice warn">
            <Icon name="alert" size={18} />
            <span>Sul server manca la chiave API (OPENAI_API_KEY nel file .env): l’analisi delle foto è disattivata.</span>
          </div>
        ) : (
          <div className="notice good">
            <Icon name="check" size={18} />
            <span>
              Analisi foto attiva: {health.provider === 'openai' ? 'OpenAI' : 'Claude'} ({health.model}).
            </span>
          </div>
        )}
        {(health !== 'loading' && health?.tokenRequired) || settings.appToken ? (
          <label className="field">
            Token server
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={settings.appToken}
              placeholder="il valore di APP_TOKEN"
              onChange={(e) => onChange({ appToken: e.target.value.trim() })}
            />
          </label>
        ) : null}
      </section>

      <section className="card stack">
        <h2>Dati</h2>
        <p className="small ink2">
          I dati restano su questo telefono. Aggiungi l’app alla schermata Home (Condividi → Aggiungi a Home) ed esporta un backup ogni tanto.
        </p>
        <div className="row wrap">
          <button type="button" className="btn" onClick={() => exportBackup(state)}>
            <Icon name="download" size={18} /> Esporta backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={18} /> Importa
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const s = await readBackup(f);
                if (confirm('Sostituire i dati attuali con quelli del backup?')) {
                  onImport(s);
                  setImportMsg('Backup importato.');
                }
              } catch (err) {
                setImportMsg((err as Error).message);
              }
            }}
          />
        </div>
        {importMsg && <p className="small ink2">{importMsg}</p>}
        <button
          type="button"
          className="btn danger"
          onClick={() => confirm('Cancellare tutti i pasti, le pesate e le misure? L’operazione non si può annullare.') && onReset()}
        >
          <Icon name="trash" size={18} /> Cancella tutti i dati
        </button>
      </section>

      <p className="xsmall muted center" style={{ padding: '0 8px 8px' }}>
        NutriScatto fornisce stime a scopo informativo e non sostituisce il parere del medico o del nutrizionista. Valori dei prodotti da Open
        Food Facts (licenza ODbL).
      </p>
    </div>
  );
}

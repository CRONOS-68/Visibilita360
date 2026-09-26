import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { MealEditor } from './components/MealEditor';
import { dateKey, formatDay } from './lib/dates';
import { currentFasting } from './lib/glucose';
import { emptyState, loadState, requestPersistence, saveState } from './lib/storage';
import type { AppState, GlucoseEntry, Meal, Settings, WeightEntry } from './lib/types';
import { AddView, type EditorRequest } from './views/AddView';
import { GlucoseView } from './views/GlucoseView';
import { SettingsView } from './views/SettingsView';
import { TodayView } from './views/TodayView';
import { WeightView } from './views/WeightView';

type Tab = 'oggi' | 'glicemia' | 'aggiungi' | 'peso' | 'impostazioni';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'oggi', label: 'Oggi', icon: 'gauge' },
  { id: 'glicemia', label: 'Glicemia', icon: 'drop' },
  { id: 'aggiungi', label: 'Aggiungi', icon: 'plus' },
  { id: 'peso', label: 'Peso', icon: 'scale' },
  { id: 'impostazioni', label: 'Profilo', icon: 'gear' },
];

const TITLES: Record<Tab, string> = {
  oggi: 'NutriScatto',
  glicemia: 'Glicemia',
  aggiungi: 'Aggiungi pasto',
  peso: 'Peso',
  impostazioni: 'Profilo e impostazioni',
};

interface EditorState extends EditorRequest {
  isNew: boolean;
}

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('oggi');
  const [now, setNow] = useState(() => Date.now());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const today = dateKey(now);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    requestPersistence();
    // Aggiorna l'orologio: a mezzanotte i contatori di "Oggi" ripartono da zero.
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const fasting = useMemo(() => currentFasting(state.glucose, state.settings.fastingGlucose), [state.glucose, state.settings.fastingGlucose]);

  const openNewMeal = useCallback((req: EditorRequest) => setEditor({ ...req, isNew: true }), []);

  const saveMeal = (meal: Meal) => {
    setState((s) => {
      const exists = s.meals.some((m) => m.id === meal.id);
      return { ...s, meals: exists ? s.meals.map((m) => (m.id === meal.id ? meal : m)) : [...s.meals, meal] };
    });
    setEditor(null);
    setTab('oggi');
    setToast(dateKey(meal.eatenAt) === today ? 'Pasto salvato' : `Pasto salvato in ${formatDay(dateKey(meal.eatenAt))}`);
  };

  const deleteMeal = (id: string) => {
    setState((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
    setEditor(null);
    setToast('Pasto eliminato');
  };

  const toggleWalk = (id: string) =>
    setState((s) => ({ ...s, meals: s.meals.map((m) => (m.id === id ? { ...m, walkAfter: !m.walkAfter } : m)) }));

  const saveWeight = (entry: WeightEntry) => {
    setState((s) => {
      const weights = [...s.weights.filter((w) => w.date !== entry.date), entry];
      const earliest = [...weights].sort((a, b) => a.date.localeCompare(b.date))[0];
      const startWeight = s.settings.startWeight ?? earliest.kg;
      return { ...s, weights, settings: { ...s.settings, startWeight } };
    });
    setToast('Peso salvato');
  };

  const deleteWeight = (date: string) => setState((s) => ({ ...s, weights: s.weights.filter((w) => w.date !== date) }));

  const addGlucose = (e: GlucoseEntry) => {
    setState((s) => ({ ...s, glucose: [...s.glucose, e] }));
    setToast('Misurazione salvata');
  };

  const deleteGlucose = (id: string) => setState((s) => ({ ...s, glucose: s.glucose.filter((g) => g.id !== id) }));

  const updateSettings = (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div>
            <h1>{TITLES[tab]}</h1>
            <p className="sub">{formatDay(today)}</p>
          </div>
          {tab === 'oggi' && (
            <button type="button" className="icon-btn" aria-label="Aggiungi pasto" onClick={() => setTab('aggiungi')}>
              <Icon name="camera" />
            </button>
          )}
        </header>

        <main>
          {tab === 'oggi' && (
            <TodayView
              state={state}
              today={today}
              now={now}
              fasting={fasting}
              onEdit={(m) => setEditor({ meal: m, isNew: false })}
              onToggleWalk={toggleWalk}
              onGoto={setTab}
            />
          )}
          {tab === 'aggiungi' && <AddView meals={state.meals} token={state.settings.appToken} onOpenEditor={openNewMeal} />}
          {tab === 'glicemia' && (
            <GlucoseView state={state} today={today} now={now} fasting={fasting} onAdd={addGlucose} onDelete={deleteGlucose} />
          )}
          {tab === 'peso' && <WeightView state={state} today={today} onSave={saveWeight} onDelete={deleteWeight} onGoto={setTab} />}
          {tab === 'impostazioni' && (
            <SettingsView
              state={state}
              onChange={updateSettings}
              onImport={(s) => setState(s)}
              onReset={() => {
                setState(emptyState());
                setToast('Dati cancellati');
              }}
            />
          )}
        </main>
      </div>

      <nav className="tabbar" aria-label="Sezioni">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.id === 'aggiungi' ? (
                <span className="tab-add">
                  <Icon name="plus" size={26} stroke={2.4} />
                </span>
              ) : (
                <Icon name={t.icon} />
              )}
              {t.id !== 'aggiungi' && t.label}
              {t.id === 'aggiungi' && <span className="visually-hidden">{t.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {editor && (
        <MealEditor
          key={editor.meal.id}
          initial={editor.meal}
          isNew={editor.isNew}
          notes={editor.notes}
          preview={editor.preview}
          openFirstItem={editor.openFirstItem}
          onSave={saveMeal}
          onCancel={() => setEditor(null)}
          onDelete={editor.isNew ? undefined : () => confirm('Eliminare questo pasto?') && deleteMeal(editor.meal.id)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

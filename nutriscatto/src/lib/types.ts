/** Valori nutrizionali. Nei FoodItem sono riferiti a 100 g (o 100 ml). */
export interface Nutrients {
  kcal: number;
  /** Carboidrati disponibili, fibra esclusa (come nelle etichette UE). */
  carbs: number;
  sugars: number;
  fiber: number;
  protein: number;
  fat: number;
}

export type Confidence = 'alta' | 'media' | 'bassa';

export interface FoodItem {
  id: string;
  name: string;
  /** Quantità consumata in grammi (o ml). */
  grams: number;
  per100: Nutrients;
  /** Indice glicemico stimato (glucosio = 100). */
  gi: number;
  confidence?: Confidence;
  barcode?: string;
  brand?: string;
}

export type MealSource = 'foto' | 'barcode' | 'etichetta' | 'manuale';

export interface Meal {
  id: string;
  /** Istante di consumo (ISO). */
  eatenAt: string;
  name: string;
  source: MealSource;
  items: FoodItem[];
  /** 10-15 minuti di camminata subito dopo il pasto: attenua il picco glicemico. */
  walkAfter: boolean;
  /** Miniatura JPEG (data URL) della foto, se presente. */
  thumb?: string;
  note?: string;
}

export interface WeightEntry {
  /** Giorno locale YYYY-MM-DD. Una sola pesata per giorno. */
  date: string;
  kg: number;
}

export type GlucoseKind = 'digiuno' | 'pre-pasto' | 'post-pasto' | 'altro';

export interface GlucoseEntry {
  id: string;
  at: string;
  value: number;
  kind: GlucoseKind;
}

export type Sex = 'M' | 'F' | '';

export interface Profile {
  sex: Sex;
  age: number | null;
  heightCm: number | null;
  /** Moltiplicatore di attività (1.2 sedentario ... 1.725 molto attivo). */
  activity: number;
}

export interface Settings {
  kcalMax: number;
  /** Glicemia a digiuno di partenza (mg/dL); le misure "a digiuno" la aggiornano. */
  fastingGlucose: number;
  targetGlucose: number;
  startWeight: number | null;
  weightLossGoal: number;
  profile: Profile;
  appToken: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  meals: Meal[];
  weights: WeightEntry[];
  glucose: GlucoseEntry[];
}

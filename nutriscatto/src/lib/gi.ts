import type { Nutrients } from './types';

/*
 * Stima dell'indice glicemico (glucosio = 100) per prodotti da codice a barre o inseriti a mano.
 * Prima cerca parole chiave nel nome e nelle categorie Open Food Facts (valori medi
 * dalle tabelle internazionali di IG), poi ricade su una stima dai macronutrienti.
 * L'ordine conta: le voci specifiche precedono quelle generiche.
 */
const TABLE: [RegExp, number][] = [
  [/\b(glucosio|glucose|destrosio|dextrose)\b/, 100],
  [/\b(gallett\w*|rice cakes?|puffed rice|riso soffiato)\b/, 82],
  [/\b(corn ?flakes?|fiocchi di mais)\b/, 81],
  [/\b(pure|mashed potato\w*)\b/, 85],
  [/\b(patatine|chips|crisps)\b/, 56],
  [/\b(patate fritte|french fries)\b/, 63],
  [/\b(patat\w*|potato\w*)\b/, 78],
  [/\b(baguette)\b/, 95],
  [/\b(pane di segale|rye bread\w*)\b/, 58],
  [/\b(pane integrale|wholemeal bread\w*|whole wheat bread\w*)\b/, 70],
  [/\b(fette biscottate|rusks?)\b/, 70],
  [/\b(grissin\w*|breadsticks?)\b/, 70],
  [/\b(cracker\w*)\b/, 74],
  [/\b(focacci\w*)\b/, 70],
  [/\b(pizz\w*)\b/, 60],
  [/\b(pane|panino|breads?|toast)\b/, 75],
  [/\b(riso basmati|basmati)\b/, 58],
  [/\b(riso integrale|brown rice)\b/, 68],
  [/\b(riso|risotto|rices?)\b/, 73],
  [/\b(gnocchi)\b/, 68],
  [/\b(pasta integrale|whole ?wheat pasta\w*|wholemeal pasta\w*)\b/, 48],
  [/\b(pasta|pastas|spaghetti|penne|fusilli|maccheroni|rigatoni|tagliatelle|lasagn\w*|noodles?)\b/, 50],
  [/\b(cous ?cous)\b/, 65],
  [/\b(polenta)\b/, 68],
  [/\b(farro|spelt)\b/, 45],
  [/\b(orzo|barley)\b/, 28],
  [/\b(quinoa)\b/, 53],
  [/\b(avena|oats?|oatmeal|porridge)\b/, 55],
  [/\b(muesli|granola)\b/, 57],
  [/\b(breakfast cereals?|cereali)\b/, 70],
  [/\b(cornett\w*|croissants?|brioche\w*)\b/, 67],
  [/\b(biscott\w*|biscuits?|cookies?|frollin\w*)\b/, 57],
  [/\b(tort\w*|cakes?|merendin\w*|pan di spagna)\b/, 60],
  [/\b(gelat\w*|ice creams?)\b/, 51],
  [/\b(cioccolat\w*|chocolates?)\b/, 40],
  [/\b(miele|honeys?)\b/, 61],
  [/\b(marmellat\w*|confettur\w*|jams?)\b/, 50],
  [/\b(zucchero|sugars?)\b/, 65],
  [/\b(energy drinks?)\b/, 70],
  [/\b(cola|sodas?|bibit\w*|aranciata|soft drinks?|sweetened beverages?)\b/, 63],
  [/\b(succ\w*|juices?|nettar\w*)\b/, 50],
  [/\b(yogurt\w*|yoghurt\w*)\b/, 35],
  [/\b(latte|milks?)\b/, 37],
  [/\b(formagg\w*|cheeses?|mozzarell\w*|parmigian\w*)\b/, 30],
  [/\b(ceci|chickpeas?)\b/, 28],
  [/\b(lenticchi\w*|lentils?)\b/, 32],
  [/\b(fagiol\w*|beans?)\b/, 30],
  [/\b(pisell\w*|peas)\b/, 51],
  [/\b(legum\w*|legumes?)\b/, 30],
  [/\b(frutta secca|noci|mandorl\w*|nocciol\w*|pistacch\w*|nuts?)\b/, 15],
  [/\b(anguria|cocomero|watermelon)\b/, 76],
  [/\b(banan\w*)\b/, 51],
  [/\b(uva|grapes?)\b/, 59],
  [/\b(ananas|pineapple)\b/, 59],
  [/\b(mango)\b/, 51],
  [/\b(kiwi)\b/, 50],
  [/\b(mel[ae]|apples?)\b/, 36],
  [/\b(per[ae]|pears?)\b/, 38],
  [/\b(aranc\w*|oranges?|mandarin\w*|clementin\w*)\b/, 43],
  [/\b(pesc[ah]\w*|peach\w*)\b/, 42],
  [/\b(fragol\w*|strawberr\w*|frutti di bosco|berries)\b/, 40],
  [/\b(carot\w*|carrots?)\b/, 39],
  [/\b(fruits?|frutta)\b/, 45],
  [/\b(verdur\w*|insalat\w*|vegetables?|salads?|zucchin\w*|pomodor\w*|tomato\w*|spinaci|broccol\w*)\b/, 15],
];

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^[a-z]{2}:/gm, '')
    .replace(/[-_:,.;/()']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function giFromText(text: string): number | null {
  const norm = normalizeText(text);
  for (const [re, gi] of TABLE) if (re.test(norm)) return gi;
  return null;
}

/** Stima dai macronutrienti per 100 g quando il nome non basta. */
export function giFromNutrients(n: Nutrients): number {
  if (n.carbs < 3) return 0; // carboidrati trascurabili: carico glicemico nullo
  let gi = 62;
  gi -= 60 * (n.fiber / (n.carbs + n.fiber));
  gi -= 10 * Math.min(1, (n.fat + n.protein) / n.carbs);
  if (n.sugars / n.carbs > 0.5) gi = 0.5 * gi + 0.5 * 58; // zuccheri misti (saccarosio, fruttosio, lattosio)
  return Math.round(Math.min(90, Math.max(25, gi)));
}

/**
 * Il nome ha la precedenza; poi le categorie Open Food Facts dalla più specifica
 * (sono ordinate dalla generica alla specifica). Le categorie composte come
 * "cereals-and-potatoes" sono troppo generiche e vengono ignorate.
 */
export function estimateGI(name: string, n: Nutrients, categories: string[] = []): number {
  if (n.carbs < 3) return 0;
  const fromName = giFromText(name);
  if (fromName != null) return fromName;
  for (const tag of [...categories].reverse()) {
    if (tag.includes('-and-')) continue;
    const gi = giFromText(tag);
    if (gi != null) return gi;
  }
  return giFromNutrients(n);
}

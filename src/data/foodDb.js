export const FOOD_DB = {
  "paneer 100g":        { p: 18, c: 260 },
  "sprouts 1 cup":      { p: 13, c: 120 },
  "soya chunks 100g":   { p: 52, c: 345 },
  "moong dal 1 bowl":   { p: 15, c: 250 },
  "rajma 1 bowl":       { p: 12, c: 220 },
  "milk 250ml":         { p: 8,  c: 150 },
  "curd 1 bowl":        { p: 6,  c: 100 },
  "egg":                { p: 6,  c: 70  },
  "roti":               { p: 3,  c: 100 },
  "banana":             { p: 1,  c: 90  },
  "peanuts 30g":        { p: 8,  c: 170 },
  "rice 1 bowl":        { p: 4,  c: 200 },
  "chaap medium":       { p: 12, c: 200 },
  "coffee":             { p: 1,  c: 15  },
  "almonds 10":         { p: 3,  c: 70  },
  "custard 1 bowl":     { p: 4,  c: 180 },
  "gobhi sabzi 1 bowl": { p: 4,  c: 120 },
  "salad 1 bowl":       { p: 2,  c: 40  },
  "carrot pea sabzi":   { p: 4,  c: 110 },
};

export function foodDbString() {
  return Object.entries(FOOD_DB)
    .map(([name, { p, c }]) => `${name}: ${p}g protein, ${c} kcal`)
    .join('\n');
}

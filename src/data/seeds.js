// Raw seed inputs — macros and muscles are computed via Gemini at first run

export const DIET_SEED_INPUTS = [
  // Day 1 — March 10
  { id: 1001, date: '2025-03-10', time: '6:00 PM',  text: '3 bananas + 2 Bru black coffee' },
  { id: 1002, date: '2025-03-10', time: '9:00 PM',  text: 'Paneer sabzi (capsicum, onion, tomato) + 2 roti' },
  { id: 1003, date: '2025-03-10', time: '3:00 AM',  text: '3 bananas (late night snack)' },
  // Day 2 — March 11
  { id: 1004, date: '2025-03-11', time: '1:00 PM',  text: 'Gobhi sabzi + custard + 2 roti' },
  { id: 1005, date: '2025-03-11', time: '6:30 PM',  text: 'Black coffee' },
  { id: 1006, date: '2025-03-11', time: '8:30 PM',  text: 'Big bowl moong dal + curd 1 bowl + 2 roti' },
  { id: 1007, date: '2025-03-11', time: '11:30 PM', text: '10–15 almonds + 2 bananas' },
  // Day 3 — March 12
  { id: 1008, date: '2025-03-12', time: '9:00 AM',  text: 'Carrot pea sabzi + 2 roti' },
  { id: 1009, date: '2025-03-12', time: '1:00 PM',  text: 'Curd 1 bowl + 2 black coffee' },
  { id: 1010, date: '2025-03-12', time: '6:00 PM',  text: '37g Haldiram peanuts' },
  { id: 1011, date: '2025-03-12', time: '9:00 PM',  text: '2 roti + chaap medium + big bowl sprouts + salad 1 bowl' },
];

export const WORKOUT_SEED_INPUTS = [
  {
    id: 2001,
    date: '2025-03-10',
    dayLabel: 'Push A (Chest/Shoulders/Tri) — Mon, 10 Mar',
    exercises: [
      'Diamond push-ups 3 × 10, 8, 7',
      'Knuckle push-ups 3 × 10',
      'Normal push-ups 2 × 10',
      'Incline push-ups 3 × 15',
      'Pull-ups 2 × 4',
      'Wrist curls 4 × 20 (bodyweight ladder)',
      'Reverse wrist curls 3 × 15',
      'Bicep curls 12kg × 8 → 10kg × 8 → 8kg × 10 → 6kg × 12 (drop set)',
      'Walk 45 min',
    ],
    notes: '',
  },
  {
    id: 2002,
    date: '2025-03-11',
    dayLabel: 'Mixed — Tue, 11 Mar (two sessions)',
    exercises: [
      '// Session 1 — evening',
      'Wrist curls 3 × 20',
      'Bicep curls 3 × 12 @ 8kg',
      'Plank 1 × 90s',
      'Mountain climbers 3 × 20',
      'Plank 1 × 60s',
      '// Session 2 — 11 PM',
      'Backpack push-ups 3 × max (12, 10, 9)',
      'Air squats 3 × 20',
      'Normal push-ups 2 × max (15, 12)',
      'Burpees 3 × 15',
    ],
    notes: '',
  },
  {
    id: 2003,
    date: '2025-03-12',
    dayLabel: 'Pull B + Forearms — Wed, 12 Mar (two sessions)',
    exercises: [
      '// Session 1 — 1 PM',
      'Bicep curls 3 × 10 @ 8kg',
      'Wrist curls 3 × 20',
      '// Session 2 — 6 PM',
      'Pull-ups 5 × 4',
      'DB rows 4 × 12 @ 6→8→10kg (progressive)',
      'DB flies 3 × 12 @ 6→8kg',
      'Reverse wrist curls 3 × 15',
      'Hammer curls 2 × 10 @ 8kg',
    ],
    notes: '',
  },
];

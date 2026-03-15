export const TRAINING_PLAN = [
  {
    day: "Monday",
    label: "Push A (Chest/Shoulders/Tri)",
    exercises: [
      "Diamond Push-ups 3×max",
      "Backpack Push-ups 3×10",
      "Incline Push-ups 3×15",
      "Pike Push-ups 3×8",
      "Chair Dips 3×12",
      "DB Shoulder Press 3×10 (6–8kg)",
    ],
  },
  {
    day: "Tuesday",
    label: "Pull (Back/Biceps)",
    exercises: [
      "Pull-ups 5×max (door bar)",
      "DB Rows 4×12 each (8–12kg)",
      "DB Flies 3×12 each (6–8kg)",
      "Bicep Curls drop 12→6kg ×7",
      "Hammer Curls 3×10 (8kg)",
    ],
  },
  {
    day: "Wednesday",
    label: "Legs + Core",
    exercises: [
      "Backpack Squats 4×15",
      "Walking Lunges 3×12 per leg",
      "Glute Bridges 3×20",
      "Calf Raises 4×25",
      "Plank 3×60s",
      "Mountain Climbers 3×30",
      "Leg Raises 3×15",
    ],
  },
  {
    day: "Thursday",
    label: "Push B (Volume)",
    exercises: [
      "Backpack Push-ups 3×max",
      "Wide Push-ups 3×15",
      "Knuckle Push-ups 3×12",
      "OHP w/ Backpack 3×10",
      "Lateral Raises 3×12 (6kg)",
    ],
  },
  {
    day: "Friday",
    label: "Pull B + Forearms",
    exercises: [
      "Pull-ups 5×max (door bar)",
      "Close-Grip Pull-ups 3×max",
      "DB Rows Heavy 4×10 (12kg)",
      "Concentration Curls 3×10",
      "Wrist Curls 3×20",
      "Reverse Wrist Curls 3×20",
    ],
  },
  {
    day: "Saturday",
    label: "HIIT Circuits",
    exercises: [
      "4 Rounds (45s rest between rounds):",
      "Burpees ×10",
      "Backpack Squats ×15",
      "Push-ups ×max",
      "Mountain Climbers ×20",
      "DB Rows ×12",
      "Jump Squats ×10",
    ],
  },
  {
    day: "Sunday",
    label: "Active Rest",
    exercises: [
      "30–60 min park walk",
      "Light stretching",
    ],
  },
];

// Maps JS day index (0=Sun) to training plan index (0=Mon)
export function getDayPlanIndex(jsDay) {
  // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function dateToplanIndex(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return getDayPlanIndex(d.getDay());
}

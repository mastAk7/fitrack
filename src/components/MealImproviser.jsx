import { useMemo } from 'react';

const MEAL_SUGGESTIONS = [
  {
    title: 'Soya Power Bowl',
    summary: '80g boiled soya chunks + 1 bowl curd + cucumber salad',
    p: 46,
    cal: 380,
    tag: 'Highest Density',
    color: '#00e676',
  },
  {
    title: 'Paneer & Dal Combo',
    summary: '120g fresh paneer + 1 bowl moong dal + 1 roti',
    p: 38,
    cal: 430,
    tag: 'Balanced',
    color: '#b388ff',
  },
  {
    title: 'Egg & Milk Booster',
    summary: '4 boiled eggs (2 whole, 2 whites) + 1 glass milk (250ml)',
    p: 28,
    cal: 310,
    tag: 'Quick Fix',
    color: '#ffab40',
  },
  {
    title: 'Lean Finish (Calorie Saver)',
    summary: '60g boiled soya chunks in warm soup + 1 cup curd',
    p: 35,
    cal: 260,
    tag: 'Pure Protein',
    color: '#00e676',
  },
];

export default function MealImproviser({ dayMeals, targets, onSelectSuggestion }) {
  const { totalP, totalC, remP, remC, density, carbTrapDetected } = useMemo(() => {
    const p = Math.round(dayMeals.reduce((s, e) => s + (e.protein_g || 0), 0) * 10) / 10;
    const c = Math.round(dayMeals.reduce((s, e) => s + (e.calories || 0), 0));
    const rp = Math.max(0, Math.round((targets.pro - p) * 10) / 10);
    const rc = Math.max(0, Math.round(targets.cal - c));
    const d = rc > 0 ? (rp / (rc / 100)) : 99;

    // Check if the last meal was low protein and carb heavy
    const lastMeal = dayMeals[dayMeals.length - 1];
    const trap = lastMeal && (lastMeal.protein_g < 14) && (lastMeal.calories > 320);

    return { totalP: p, totalC: c, remP: rp, remC: rc, density: d, carbTrapDetected: trap };
  }, [dayMeals, targets]);

  // If already reached protein target
  if (remP <= 0 && dayMeals.length > 0) {
    return (
      <div style={{
        background: '#0a1f14', border: '1px solid #00e67640', borderRadius: 12,
        padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00e676' }}>Protein Target Achieved!</div>
          <div style={{ fontSize: 11, color: '#7a7a8a' }}>
            {totalP}g logged (target {targets.pro}g). {remC > 0 ? `${remC} kcal left if you need light fuel.` : 'Calorie target reached.'}
          </div>
        </div>
      </div>
    );
  }

  // Filter recommendations based on remaining calories
  const recommendations = MEAL_SUGGESTIONS.filter(s => remC < 350 ? s.cal <= 330 : true).slice(0, 2);

  return (
    <div style={{
      background: '#101018', border: '1px solid #1e1e2a', borderRadius: 12,
      padding: '12px 14px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e8e8ed', letterSpacing: '0.2px' }}>
            {carbTrapDetected ? 'Next-Meal Pivot Needed' : 'Dynamic Macro Runway'}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
          background: density >= 8 ? '#ff525220' : '#b388ff15',
          color: density >= 8 ? '#ff5252' : '#b388ff',
          border: `1px solid ${density >= 8 ? '#ff525240' : '#b388ff30'}`,
        }}>
          Need {remP}g P in {remC} kcal
        </span>
      </div>

      <div style={{ fontSize: 11, color: '#9a9aaa', lineHeight: 1.5, marginBottom: 10 }}>
        {carbTrapDetected
          ? `Your earlier meal was carb-heavy (${dayMeals[dayMeals.length - 1].protein_g}g P). Balance your day with a high-density protein pivot:`
          : remC < 350 && remP > 20
          ? `Calorie runway is tight (${remC} kcal). Avoid roti/rice and prioritize pure lean sources to reach ${targets.pro}g protein:`
          : `You have ${remC} kcal remaining. Here are optimal Indian meal options to comfortably reach your ${targets.pro}g protein target:`}
      </div>

      {/* Suggestion Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recommendations.map((rec, i) => (
          <div
            key={i}
            onClick={() => onSelectSuggestion?.(rec.summary)}
            style={{
              background: '#0a0a0f', border: '1px solid #1a1a26', borderRadius: 8,
              padding: '8px 10px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', cursor: onSelectSuggestion ? 'pointer' : 'default',
              transition: 'border-color 0.15s',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e8ed' }}>{rec.title}</span>
                <span style={{ fontSize: 9, color: rec.color, background: `${rec.color}15`, padding: '1px 6px', borderRadius: 4 }}>
                  {rec.tag}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#7a7a8a', marginTop: 2 }}>{rec.summary}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00e676' }}>+{rec.p}g P</div>
              <div style={{ fontSize: 10, color: '#ffab40' }}>{rec.cal} kcal</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

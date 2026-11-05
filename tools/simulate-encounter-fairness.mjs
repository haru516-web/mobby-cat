import '../app/tests/pure-loader.mjs';

const { CATS } = await import('../app/src/data/catalog.ts');
const { isRealCat } = await import('../app/src/core/recipes.ts');
const { guaranteedCats } = await import('../app/src/core/conditions.ts');
const { buildDay, isRareEncounter } = await import('../app/src/core/encounter.ts');

const DAYS = 3000;
const START = new Date(2026, 0, 1);
const normalCats = CATS.filter(isRealCat);
const rareCats = CATS.filter((cat) => !isRealCat(cat) && cat.kind !== 'world' && cat.kind !== 'travel' && isRareEncounter(cat.id));
const profiles = [
  { name: 'beginner', normal: 1, rare: 0, favorites: 0, pets: 0, home: false, birthday: false, streak: [1, 2] },
  { name: 'casual', normal: 10, rare: 0, favorites: 1, pets: 10, home: false, birthday: true, streak: [1, 3, 7] },
  { name: 'collector', normal: 30, rare: 3, favorites: 3, pets: 60, home: true, birthday: true, streak: [1, 3, 7, 14] },
  { name: 'longtime', normal: 60, rare: 6, favorites: 6, pets: 150, home: true, birthday: true, streak: [1, 3, 7, 14, 30] },
];

function runProfile(profile) {
  let seed = 20261031;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = (values) => values[Math.floor(random() * values.length)];
  const ownedCats = [...normalCats.slice(0, profile.normal), ...rareCats.slice(0, profile.rare)];
  const owned = Object.fromEntries(ownedCats.map((cat) => [cat.id, { count: 1 }]));
  const context = { owned, appearCounts: {} };
  const favorites = normalCats.slice(0, profile.favorites).map((cat) => cat.id);
  let total = 0;
  let realTotal = 0;
  let otherTotal = 0;
  let max = 0;
  let over12Days = 0;
  let zeroDays = 0;
  let candidateMismatchDays = 0;
  let maxDate = '';
  let maxSignals;
  let maxEligible = [];
  const over12Cats = {};

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(START.getFullYear(), START.getMonth(), START.getDate() + i);
    const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const gapDays = pick([1, 1, 1, 1, 1, 1, 1, 3, 7]);
    const signals = {
      steps: pick([0, 500, 1500, 3500, 6000, 9000, 13000]),
      battery: [Math.floor(random() * 101)],
      charging: random() < 0.5,
      streak: gapDays >= 3 ? 1 : pick(profile.streak),
      openHours: [pick([6, 8, 11, 14, 17, 18, 21, 23])],
      weather: pick(['sunny', 'sunny', 'sunny', 'sunny', 'cloudy', 'cloudy', 'cloudy', 'rain', 'rain', 'snow']),
      gapDays,
      catalogUpdated: false,
      birthday: profile.birthday ? { m: 7, d: 1 } : null,
      favorites,
      homeConfigured: profile.home,
      totals: { steps: 0, photos: 0, pets: profile.pets, openDays: profile.normal, cats: profile.normal + profile.rare },
    };
    if (process.argv.includes('--multi')) {
      signals.battery.push(Math.floor(random() * 101), Math.floor(random() * 101));
      signals.openHours.push(pick([6, 8, 11, 14, 17, 18, 21, 23]));
    }
    if (process.argv.includes('--no-sensors')) {
      Object.assign(signals, { steps: null, battery: [], charging: false, weather: null });
    }

    const eligible = guaranteedCats(day, signals, context);
    const result = buildDay(day, signals, context);
    const eligibleIds = new Set(eligible.map((cat) => cat.id));
    const candidateIds = new Set(result.candidates);
    if (eligibleIds.size !== candidateIds.size || [...eligibleIds].some((id) => !candidateIds.has(id))) candidateMismatchDays++;
    const count = result.candidates.length;
    total += count;
    realTotal += result.candidates.filter((id) => isRealCat(CATS.find((cat) => cat.id === id))).length;
    otherTotal += count - result.candidates.filter((id) => isRealCat(CATS.find((cat) => cat.id === id))).length;
    if (count === 0) zeroDays++;
    if (count > 12) over12Days++;
    if (count > 12) for (const cat of eligible) over12Cats[cat.id] = (over12Cats[cat.id] ?? 0) + 1;
    if (count > max) {
      max = count;
      maxDate = day;
      maxSignals = signals;
      maxEligible = eligible.map(({ id, reason }) => ({ id, reason }));
    }
  }

  return {
    profile: profile.name,
    days: DAYS,
    mean: Number((total / DAYS).toFixed(3)),
    normalMean: Number((realTotal / DAYS).toFixed(3)),
    otherMean: Number((otherTotal / DAYS).toFixed(3)),
    max,
    maxDate,
    over12Days,
    zeroDays,
    zeroPercent: Number((100 * zeroDays / DAYS).toFixed(3)),
    candidateMismatchDays,
    ...(process.argv.includes('--explain') ? {
      maxSignals,
      maxEligible,
      frequentOver12Cats: Object.entries(over12Cats).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([id, days]) => ({ id, days })),
    } : {}),
  };
}

const results = profiles.map(runProfile);
const totalDays = DAYS * results.length;
const overall = {
  profiles: results.length,
  daysPerProfile: DAYS,
  simulatedUserDays: totalDays,
  mean: Number((results.reduce((sum, result) => sum + result.mean * DAYS, 0) / totalDays).toFixed(3)),
  max: Math.max(...results.map((result) => result.max)),
  over12Days: results.reduce((sum, result) => sum + result.over12Days, 0),
  zeroDays: results.reduce((sum, result) => sum + result.zeroDays, 0),
  zeroPercent: Number((100 * results.reduce((sum, result) => sum + result.zeroDays, 0) / totalDays).toFixed(3)),
  candidateMismatchDays: results.reduce((sum, result) => sum + result.candidateMismatchDays, 0),
};

console.log(JSON.stringify({ seed: 20261031, overall, profiles: results }, null, 2));

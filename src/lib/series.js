const MONTH_INDEX = new Map([
  ['jan', 0], ['feb', 1], ['mar', 2], ['apr', 3], ['may', 4], ['jun', 5],
  ['jul', 6], ['aug', 7], ['sep', 8], ['oct', 9], ['nov', 10], ['dec', 11],
]);

export function monthIndex(month) {
  const key = String(month || '').trim().slice(0, 3).toLowerCase();
  return MONTH_INDEX.get(key) ?? 0;
}

export function sortByYearMonth(records) {
  return [...records].sort((a, b) => {
    const aKey = (Number(a.year) || 0) * 12 + monthIndex(a.month);
    const bKey = (Number(b.year) || 0) * 12 + monthIndex(b.month);
    return aKey - bKey;
  });
}

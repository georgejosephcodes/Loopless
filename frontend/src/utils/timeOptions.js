// Every 15 minutes from 00:00 to 23:45, for time-of-day <select> dropdowns.
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const label = `${h12}:${String(m).padStart(2, '0')} ${period}`;
  return { value, label };
});

// "HH:MM" -> minutes since midnight, or null if invalid
function timeStringToMinutes(str) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return h * 60 + m;
}

// minutes since midnight -> "HH:MM"
function minutesToTimeString(totalMinutes) {
  const clamped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = { timeStringToMinutes, minutesToTimeString };

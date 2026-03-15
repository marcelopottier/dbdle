/**
 * Utility for Brasília time (UTC-3)
 */

export const getBrasiliaDate = () => {
  const now = new Date();
  // We use Intl to get the date in Sâo Paulo/Brasília timezone formatted as YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
};

export const getBrasiliaTimeLeft = () => {
  const now = new Date();
  
  // Target is 00:00 Brasília time.
  // We can calculate this by taking the current Brasília date and setting it to 00:00 tomorrow.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  // Create a date object that represents "now" in the eyes of Brasília
  const bNow = new Date(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    parseInt(map.hour),
    parseInt(map.minute),
    parseInt(map.second)
  );
  
  const bTarget = new Date(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    0, 0, 0
  );
  bTarget.setDate(bTarget.getDate() + 1);
  
  const diff = bTarget.getTime() - bNow.getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${h}h ${m}m ${s}s`;
};

export const saveGameState = (mode: string, state: any) => {
  const date = getBrasiliaDate();
  const key = `dbdle_${mode}_${date}`;
  localStorage.setItem(key, JSON.stringify(state));
  
  // Clean up old states to keep localStorage tidy (optional but good practice)
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(`dbdle_${mode}_`) && k !== key) {
      localStorage.removeItem(k);
    }
  });
};

export const loadGameState = (mode: string) => {
  const date = getBrasiliaDate();
  const key = `dbdle_${mode}_${date}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : null;
};

export const updateStreak = () => {
  const today = getBrasiliaDate();
  const lastWinDate = localStorage.getItem('dbdle_last_win_date');
  const currentStreak = parseInt(localStorage.getItem('dbdle_streak') || '0');

  if (lastWinDate === today) return currentStreak;

  // Compute "yesterday" in Brasília reliably by deriving Brasília "now" parts
  // and subtracting one day in that timezone context.
  const now = new Date();
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = partsFormatter.formatToParts(now);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const bNow = new Date(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    parseInt(map.hour),
    parseInt(map.minute),
    parseInt(map.second)
  );
  const bYesterday = new Date(bNow);
  bYesterday.setDate(bNow.getDate() - 1);
  const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(bYesterday);

  let newStreak = 1;
  if (lastWinDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  }

  localStorage.setItem('dbdle_streak', newStreak.toString());
  localStorage.setItem('dbdle_last_win_date', today);
  return newStreak;
};

export const getStreak = () => {
  const lastWinDate = localStorage.getItem('dbdle_last_win_date');
  if (!lastWinDate) return 0;
  
  const today = getBrasiliaDate();
  if (lastWinDate === today) return parseInt(localStorage.getItem('dbdle_streak') || '0');
  // Compute Brasília "yesterday" consistently (same approach as in updateStreak)
  const now = new Date();
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = partsFormatter.formatToParts(now);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const bNow = new Date(
    parseInt(map.year),
    parseInt(map.month) - 1,
    parseInt(map.day),
    parseInt(map.hour),
    parseInt(map.minute),
    parseInt(map.second)
  );
  const bYesterday = new Date(bNow);
  bYesterday.setDate(bNow.getDate() - 1);
  const yesterdayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(bYesterday);

  if (lastWinDate === yesterdayStr) return parseInt(localStorage.getItem('dbdle_streak') || '0');
  
  return 0; // Streak broken
};

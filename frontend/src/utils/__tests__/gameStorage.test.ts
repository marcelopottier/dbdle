import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBrasiliaDate,
  saveGameState,
  loadGameState,
  updateStreak,
  getStreak,
} from '../gameStorage';

// Helper to compute Brasília 'yesterday' string same way as the implementation
const getBrasiliaYesterday = () => {
  const now = new Date();
  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = partsFormatter.formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(bYesterday);
};

describe('gameStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getBrasiliaDate returns YYYY-MM-DD', () => {
    const d = getBrasiliaDate();
    expect(d).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  });

  it('save/load game state uses date-scoped key', () => {
    const mode = 'testmode';
    const state = { a: 1, b: 'x' };
    saveGameState(mode, state);
    const loaded = loadGameState(mode);
    expect(loaded).toEqual(state);

    // Ensure only today's key exists
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(`dbdle_${mode}_`));
    expect(keys.length).toBe(1);
  });

  it('updateStreak increments streak when last win was yesterday (Brasília)', () => {
    const today = getBrasiliaDate();
    const yesterday = getBrasiliaYesterday();

    // set previous streak and last win to yesterday
    localStorage.setItem('dbdle_streak', '3');
    localStorage.setItem('dbdle_last_win_date', yesterday);

    const newStreak = updateStreak();
    expect(newStreak).toBe(4);
    expect(localStorage.getItem('dbdle_last_win_date')).toBe(today);
    expect(localStorage.getItem('dbdle_streak')).toBe('4');
  });

  it('getStreak returns 0 if last win older than yesterday', () => {
    const older = '2000-01-01';
    localStorage.setItem('dbdle_last_win_date', older);
    localStorage.setItem('dbdle_streak', '10');

    const s = getStreak();
    expect(s).toBe(0);
  });
});

import { useState, useEffect } from 'react';
import InfoButton from '../components/InfoButton';
import { getBrasiliaDate, getBrasiliaTimeLeft, saveGameState, loadGameState, updateStreak } from '../utils/gameStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const perkIcon = (iconUrl: string | null) => {
  if (!iconUrl) return null;
  if (iconUrl.startsWith('/')) return `${API_URL}${iconUrl}`;
  return `${API_URL}/proxy/perk-icon?url=${encodeURIComponent(iconUrl)}`;
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ConnectionsPerk {
  name: string;
  iconUrl: string | null;
}

interface ConnectionsGroup {
  theme: string;
  color: 'yellow' | 'green' | 'blue' | 'purple';
  difficulty: number;
  perks: ConnectionsPerk[];
}

interface ConnectionsPuzzle {
  date: string;
  groups: ConnectionsGroup[];
}

type GameStatus = 'playing' | 'won' | 'lost';

interface GuessRecord {
  perks: ConnectionsPerk[];
  correct: boolean;
  oneAway: boolean;
  groupColor?: string;
  groupTheme?: string;
}

interface GameState {
  solvedGroups: ConnectionsGroup[];
  guesses: GuessRecord[];
  status: GameStatus;
  mistakesLeft: number;
}

// ── Color config ──────────────────────────────────────────────────────────────

const COLOR_CONFIG = {
  yellow:  { bg: 'bg-[#b8941a]',  border: 'border-[#b8941a]',  text: 'text-white',       glow: 'shadow-[0_0_20px_rgba(184,148,26,0.4)]'  },
  green:   { bg: 'bg-[#27ae60]',  border: 'border-[#27ae60]',  text: 'text-white',       glow: 'shadow-[0_0_20px_rgba(39,174,96,0.4)]'   },
  blue:    { bg: 'bg-[#2980b9]',  border: 'border-[#2980b9]',  text: 'text-white',       glow: 'shadow-[0_0_20px_rgba(41,128,185,0.4)]'  },
  purple:  { bg: 'bg-[#8e44ad]',  border: 'border-[#8e44ad]',  text: 'text-white',       glow: 'shadow-[0_0_20px_rgba(142,68,173,0.4)]'  },
} as const;

const MAX_MISTAKES = 4;

// ── PerkTile ─────────────────────────────────────────────────────────────────

const PerkTile = ({
  perk,
  selected,
  disabled,
  shake,
  onClick,
}: {
  perk: ConnectionsPerk;
  selected: boolean;
  disabled: boolean;
  shake: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative flex flex-col items-center justify-center gap-1 rounded-xl border text-center font-bold text-[10px]
      uppercase tracking-wider leading-tight px-2 py-2 h-24 transition-all duration-200 select-none
      ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}
      ${selected
        ? 'bg-blood border-blood text-white shadow-[0_0_15px_rgba(138,3,3,0.5)] scale-[1.02]'
        : disabled
          ? 'bg-card-dark/40 border-bone/5 text-bone/25 cursor-not-allowed'
          : 'bg-card-dark border-blood/20 text-bone hover:border-blood/50 hover:bg-blood/10 cursor-pointer'
      }
    `}
  >
    {perk.iconUrl ? (
      <div
        className="size-10 shrink-0"
        style={{ backgroundImage: 'url(/perk_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <img
          src={perkIcon(perk.iconUrl)!}
          alt=""
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    ) : (
      <div className="size-10 shrink-0" />
    )}
    <span className="leading-tight line-clamp-2 w-full">{perk.name}</span>
  </button>
);

// ── SolvedGroupCard ───────────────────────────────────────────────────────────

const DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard', 'Extreme'] as const;

const MissedGroupCard = ({ group, index }: { group: ConnectionsGroup; index: number }) => {
  const cfg = COLOR_CONFIG[group.color];
  const diffLabel = DIFFICULTY_LABELS[group.difficulty - 1] || 'Unknown';
  return (
    <div
      className={`w-full rounded-xl border-2 border-dashed ${cfg.border} bg-void/60 px-4 py-3 md:px-6 md:py-4 flex flex-col items-center gap-1 animate-in zoom-in-95 fade-in duration-500 opacity-70`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold tracking-[0.2em] ${cfg.text} opacity-50`}>
          {'★'.repeat(group.difficulty)}
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${cfg.text} opacity-40`}>
          {diffLabel}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-bone/30 ml-1">· missed</span>
      </div>
      <span className={`text-xs md:text-sm font-black uppercase tracking-widest ${cfg.text} opacity-60 text-center`}>{group.theme}</span>
      <div className="flex items-center justify-center gap-4 flex-wrap mt-1">
        {group.perks.map(p => (
          <div key={p.name} className="flex flex-col items-center gap-1 opacity-60">
            {p.iconUrl && (
              <div
                className="size-12 shrink-0 grayscale"
                style={{ backgroundImage: 'url(/perk_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <img src={perkIcon(p.iconUrl)!} alt="" className="w-full h-full object-contain opacity-70" />
              </div>
            )}
            <span className={`text-[10px] md:text-[11px] ${cfg.text} opacity-60 text-center max-w-18 leading-tight`}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SolvedGroupCard = ({ group, index }: { group: ConnectionsGroup; index: number }) => {
  const cfg = COLOR_CONFIG[group.color];
  const diffLabel = DIFFICULTY_LABELS[group.difficulty - 1] || 'Unknown';
  return (
    <div
      className={`w-full rounded-xl border-2 ${cfg.border} ${cfg.bg} ${cfg.glow} px-4 py-3 md:px-6 md:py-4 flex flex-col items-center gap-1 animate-in zoom-in-95 fade-in duration-500`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold tracking-[0.2em] ${cfg.text} opacity-70`}>
          {'★'.repeat(group.difficulty)}
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${cfg.text} opacity-50`}>
          {diffLabel}
        </span>
      </div>
      <span className={`text-xs md:text-sm font-black uppercase tracking-widest ${cfg.text} text-center`}>{group.theme}</span>
      <div className="flex items-center justify-center gap-4 flex-wrap mt-1">
        {group.perks.map(p => (
          <div key={p.name} className="flex flex-col items-center gap-1">
            {p.iconUrl && (
              <div
                className="size-12 shrink-0"
                style={{ backgroundImage: 'url(/perk_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <img
                  src={perkIcon(p.iconUrl)!}
                  alt=""
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            )}
            <span className={`text-[10px] md:text-[11px] ${cfg.text} opacity-90 text-center max-w-18 leading-tight`}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── MistakeDots ───────────────────────────────────────────────────────────────

const MistakeDots = ({ left }: { left: number }) => (
  <div className="flex items-center gap-2">
    <span className="text-bone/40 text-[10px] font-bold uppercase tracking-widest mr-1">Mistakes left</span>
    {[...Array(MAX_MISTAKES)].map((_, i) => (
      <div
        key={i}
        className={`size-3 rounded-full border transition-all duration-500 ${
          i < left
            ? 'bg-blood border-blood shadow-[0_0_8px_rgba(138,3,3,0.5)] scale-110'
            : 'bg-transparent border-bone/20'
        }`}
      />
    ))}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const ConnectionsMode = () => {
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGameState('connections');
    if (!saved) return { solvedGroups: [], guesses: [], status: 'playing', mistakesLeft: MAX_MISTAKES };

    // Migrate old format where perks were strings instead of { name, iconUrl }
    const migrate = (perks: unknown[]): ConnectionsPerk[] =>
      perks.map(p => typeof p === 'string' ? { name: p, iconUrl: null } : p as ConnectionsPerk);

    return {
      ...saved,
      solvedGroups: (saved.solvedGroups ?? []).map((g: ConnectionsGroup) => ({
        ...g,
        perks: migrate(g.perks),
      })),
      guesses: (saved.guesses ?? []).map((g: GuessRecord) => ({
        ...g,
        perks: migrate(g.perks),
      })),
    };
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [shakingPerks, setShakingPerks] = useState<string[]>([]);
  const [oneAwayMsg, setOneAwayMsg] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getBrasiliaTimeLeft());

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(getBrasiliaTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist state
  useEffect(() => {
    saveGameState('connections', gameState);
  }, [gameState]);

  // Fetch puzzle — and backfill iconUrls into any saved state that had strings
  useEffect(() => {
    const date = getBrasiliaDate();
    fetch(`${API_URL}/game/connections/puzzle?date=${date}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ConnectionsPuzzle>;
      })
      .then(p => {
        setPuzzle(p);
        // Build icon lookup from the fresh puzzle
        const iconMap = new Map<string, string | null>(p.groups.flatMap(g => g.perks).map(pk => [pk.name, pk.iconUrl]));
        const enrich = (perks: ConnectionsPerk[]) =>
          perks.map(pk => ({ ...pk, iconUrl: pk.iconUrl ?? iconMap.get(pk.name) ?? null }));

        setGameState(prev => ({
          ...prev,
          solvedGroups: prev.solvedGroups.map(g => ({ ...g, perks: enrich(g.perks) })),
          guesses: prev.guesses.map(g => ({ ...g, perks: enrich(g.perks) })),
        }));
      })
      .catch(() => setLoadError(true));
  }, []);

  // Build a name → perk map from the puzzle for quick lookup
  const perkMap = new Map<string, ConnectionsPerk>(
    puzzle?.groups.flatMap(g => g.perks).map(p => [p.name, p]) ?? []
  );

  // Derive which perks are still in play
  const solvedPerkNames = new Set(gameState.solvedGroups.flatMap(g => g.perks.map(p => p.name)));
  const remainingPerks: ConnectionsPerk[] = puzzle
    ? puzzle.groups.flatMap(g => g.perks).filter(p => !solvedPerkNames.has(p.name))
    : [];

  // Display order for perks (separate from puzzle.groups) so we can shuffle/interleave
  const [displayPerks, setDisplayPerks] = useState<ConnectionsPerk[] | null>(null);

  // Sync display order whenever the puzzle or solved groups change
  useEffect(() => {
    setDisplayPerks(remainingPerks);
  }, [puzzle, gameState.solvedGroups?.length]);

  const toggleSelect = (name: string) => {
    if (gameState.status !== 'playing') return;
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(p => p !== name)
        : prev.length < 4
          ? [...prev, name]
          : prev
    );
  };

  const handleSubmit = async () => {
    if (selected.length !== 4 || gameState.status !== 'playing' || !puzzle) return;

    try {
      const res = await fetch(`${API_URL}/game/connections/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: getBrasiliaDate(), perks: selected }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        correct: boolean;
        group?: ConnectionsGroup;
        oneAway: boolean;
      };

      // Enrich the guess record with iconUrls from perkMap
      const guessPerks: ConnectionsPerk[] = selected.map(name => perkMap.get(name) ?? { name, iconUrl: null });

      if (data.correct && data.group) {
        const newSolved = [...gameState.solvedGroups, data.group];
        const newStatus: GameStatus = newSolved.length === 4 ? 'won' : 'playing';
        if (newSolved.length === 4) updateStreak();

        setGameState(prev => ({
          ...prev,
          solvedGroups: newSolved,
          guesses: [...prev.guesses, {
            perks: guessPerks,
            correct: true,
            oneAway: false,
            groupColor: data.group!.color,
            groupTheme: data.group!.theme,
          }],
          status: newStatus,
        }));
      } else {
        setShakingPerks(selected);
        setTimeout(() => setShakingPerks([]), 600);

        if (data.oneAway) {
          setOneAwayMsg(true);
          setTimeout(() => setOneAwayMsg(false), 2500);
        }

        const newMistakes = gameState.mistakesLeft - 1;

        setGameState(prev => ({
          ...prev,
          guesses: [...prev.guesses, {
            perks: guessPerks,
            correct: false,
            oneAway: data.oneAway,
          }],
          mistakesLeft: newMistakes,
          status: newMistakes <= 0 ? 'lost' : 'playing',
        }));
      }
      setSelected([]);
    } catch (err) {
      console.error('Guess failed:', err);
    }
  };

  const handleShare = () => {
    const colorMap = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' };
    const resultEmoji = gameState.guesses
      .map(g => g.correct && g.groupColor
        ? colorMap[g.groupColor as keyof typeof colorMap].repeat(4)
        : '⬛⬛⬛⬛'
      )
      .join('\n');
    const text = `DBDLE Connections - ${getBrasiliaDate()}\n${gameState.status === 'won' ? 'Solved!' : 'Failed'}\n\n${resultEmoji}\n\nhttps://dbdle.fun`;
    navigator.clipboard.writeText(text).then(() => alert('Results copied to clipboard!'));
  };

  const handleShuffle = () => {
    if (!puzzle) return;
    const pool = (displayPerks ?? remainingPerks) ?? [];
    if (pool.length === 0) return;

    const cols = 4;
    const nameToTheme = new Map<string, string | undefined>(
      puzzle.groups.flatMap(g => g.perks.map(p => [p.name, g.theme]))
    );

    const fisherYates = (arr: ConnectionsPerk[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const isValid = (order: ConnectionsPerk[]) => {
      for (let r = 0; r < order.length; r += cols) {
        const row = order.slice(r, r + cols);
        const themes = new Set(row.map(p => nameToTheme.get(p.name)));
        if (themes.size !== row.length) return false;
      }
      return true;
    };

    // Try a few times to find an ordering where each row contains unique group themes
    let result: ConnectionsPerk[] | null = null;
    const attempts = Math.max(50, Math.min(500, pool.length * 20));
    for (let i = 0; i < attempts; i++) {
      const cand = fisherYates([...pool]);
      if (isValid(cand)) { result = cand; break; }
    }

    // Fallback to a plain shuffle if no constraint-satisfying order found
    if (!result) result = fisherYates([...pool]);

    setDisplayPerks(result);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-blood text-5xl mb-4 block">warning</span>
          <p className="text-bone/60 text-sm uppercase tracking-widest">No puzzle found for today.</p>
          <p className="text-bone/30 text-xs mt-2">Check back later or ask the Entity nicely.</p>
        </div>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="size-12 loading-fog rounded-full" />
          <p className="text-bone/40 text-xs font-display uppercase tracking-[0.4em]">Consulting the Entity…</p>
        </div>
      </main>
    );
  }

  const isPlaying = gameState.status === 'playing';
  const isWon = gameState.status === 'won';
  const isLost = gameState.status === 'lost';

  return (
    <main className="flex-1 flex justify-center py-6 px-4 relative overflow-hidden">

      {/* Background fog vignette */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
        style={{
          background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${Math.min((MAX_MISTAKES - gameState.mistakesLeft) / MAX_MISTAKES * 0.7, 0.7)}) 100%)`,
        }}
      />

      <div className="layout-content-container flex flex-col max-w-2xl w-full flex-1 relative z-10 gap-6">

        {/* Header */}
        <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-start gap-2">
            <p className="text-bone/40 text-xs uppercase tracking-[0.4em]">Group the perks by hidden theme</p>
          </div>
          <InfoButton mode="connections" />
        </div>

        {/* One-away toast */}
        {oneAwayMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#f39c12] text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-xl animate-in fade-in zoom-in-95 duration-300">
            One away…
          </div>
        )}

        {/* Win / Loss banner */}
        {(isWon || isLost) && (
          <div className={`rounded-2xl border-2 px-8 py-6 text-center animate-in zoom-in-95 fade-in duration-500 ${
            isWon
              ? 'border-blood/40 bg-blood/10 shadow-[0_0_40px_rgba(138,3,3,0.2)]'
              : 'border-bone/10 bg-bone/5'
          }`}>
            <span className={`material-symbols-outlined text-4xl mb-2 block ${isWon ? 'text-blood' : 'text-bone/30'}`}>
              {isWon ? 'stars' : 'skull'}
            </span>
            <h2 className={`text-2xl font-black uppercase tracking-widest font-display ${isWon ? 'text-blood' : 'text-bone/40'}`}>
              {isWon ? 'Escaped!' : 'Lost in the Fog'}
            </h2>
            {isWon ? (
              <p className="text-bone/50 text-xs uppercase tracking-widest mt-2 mb-4">
                All groups found · {MAX_MISTAKES - gameState.mistakesLeft} mistake{MAX_MISTAKES - gameState.mistakesLeft !== 1 ? 's' : ''}
              </p>
            ) : (
              <div className="mt-2 mb-4 flex flex-col gap-1">
                <p className="text-bone/50 text-xs uppercase tracking-widest">
                  {gameState.solvedGroups.length} of 4 groups found · {MAX_MISTAKES - gameState.mistakesLeft} mistakes
                </p>
                {(() => {
                  const missed = puzzle.groups.filter(g => !gameState.solvedGroups.some(sg => sg.theme === g.theme));
                  return missed.length > 0 && (
                    <p className="text-bone/30 text-[10px] tracking-wider mt-1">
                      Missed: {missed.sort((a, b) => a.difficulty - b.difficulty).map(g => g.theme).join(' · ')}
                    </p>
                  );
                })()}
              </div>
            )}
            <button onClick={handleShare} className="w-full btn-dbd flex items-center justify-center gap-3 bg-blood/20">
              <span className="material-symbols-outlined">share</span>
              Share Result
            </button>
          </div>
        )}

        {/* Solved + missed groups — sorted by difficulty */}
        {(gameState.solvedGroups.length > 0 || isLost) && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-500">
            {[...puzzle.groups].sort((a, b) => a.difficulty - b.difficulty).map((g, i) => {
              const solved = gameState.solvedGroups.some(sg => sg.theme === g.theme);
              return solved
                ? <SolvedGroupCard key={g.theme} group={g} index={i} />
                : isLost
                  ? <MissedGroupCard key={g.theme} group={g} index={i} />
                  : null;
            })}
          </div>
        )}

        {/* Perk grid */}
        {isPlaying && (displayPerks ?? remainingPerks).length > 0 && (
          <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-500">
            {(displayPerks ?? remainingPerks).map(perk => (
              <PerkTile
                key={perk.name}
                perk={perk}
                selected={selected.includes(perk.name)}
                disabled={!isPlaying}
                shake={shakingPerks.includes(perk.name)}
                onClick={() => toggleSelect(perk.name)}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        {isPlaying && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
            <MistakeDots left={gameState.mistakesLeft} />
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={handleShuffle}
                className="px-5 py-2.5 rounded-xl border border-bone/10 bg-card-dark text-bone/60 hover:text-bone hover:border-blood/30 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">shuffle</span>
                Shuffle
              </button>
              <button
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
                className="px-5 py-2.5 rounded-xl border border-bone/10 bg-card-dark text-bone/60 hover:text-bone hover:border-blood/30 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">deselect</span>
                Deselect
              </button>
              <button
                onClick={handleSubmit}
                disabled={selected.length !== 4}
                className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                  selected.length === 4
                    ? 'bg-blood hover:bg-blood/80 text-white border-blood/50 shadow-blood/20 shadow-lg cursor-pointer'
                    : 'bg-card-dark text-bone/20 border-blood/10 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Submit ({selected.length}/4)
              </button>
            </div>
          </div>
        )}

        {/* Guess history */}
        {gameState.guesses.length > 0 && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className="text-bone/30 text-[10px] uppercase tracking-widest font-bold">Guess history</p>
            <div className="flex flex-col gap-3 w-full">
              {gameState.guesses.map((g, i) => {
                const cfg = g.groupColor ? COLOR_CONFIG[g.groupColor as keyof typeof COLOR_CONFIG] : null;
                return (
                  <div key={i} className="flex flex-col gap-1">
                    {g.correct && g.groupTheme && (
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg ? cfg.text : 'text-bone/40'}`}>
                        {g.groupTheme}
                      </span>
                    )}
                    {!g.correct && g.oneAway && (
                      <span className="text-[10px] font-bold text-[#f39c12] uppercase tracking-widest">One away!</span>
                    )}
                    {!g.correct && !g.oneAway && (
                      <span className="text-[10px] font-bold text-blood/50 uppercase tracking-widest">Wrong</span>
                    )}
                    <div className="grid grid-cols-4 gap-1.5">
                      {g.perks.map(p => (
                        <div
                          key={p.name}
                          className={`rounded font-bold flex flex-col items-center gap-1 px-1 py-2 border ${
                            g.correct && cfg
                              ? `${cfg.bg} ${cfg.text} border-transparent`
                              : g.oneAway
                                ? 'bg-[#f39c12]/10 text-[#f39c12] border-[#f39c12]/40'
                                : 'bg-blood/5 text-blood/50 border-blood/20'
                          }`}
                          title={p.name}
                        >
                          {p.iconUrl && (
                            <div
                              className="size-10 shrink-0"
                              style={{ backgroundImage: 'url(/perk_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
                            >
                              <img
                                src={perkIcon(p.iconUrl)!}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <span className="text-[10px] text-center leading-tight line-clamp-2 w-full">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer countdown */}
        <footer className="mt-auto mb-10 text-center">
          <p className="text-bone/40 italic text-sm mb-4">"The Entity arranges the perks in mysterious ways…"</p>
          <div className="flex justify-center pt-4 border-t border-bone/5">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="material-symbols-outlined text-blood text-xl scale-x-[-1]">schedule</span>
                <p className="text-[10px] font-black text-bone/30 uppercase tracking-widest">Next Puzzle</p>
              </div>
              <p className="text-bone text-3xl font-black italic tracking-tighter tabular-nums">{timeLeft}</p>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
};

export default ConnectionsMode;

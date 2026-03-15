import { useState, useEffect, useRef } from 'react';
import InfoButton from '../components/InfoButton';
import { getBrasiliaDate, getBrasiliaTimeLeft, saveGameState, loadGameState, updateStreak } from '../utils/gameStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const MAX_ATTEMPTS = 5;

const perkIcon = (iconUrl: string | null) => {
  if (!iconUrl) return null;
  if (iconUrl.startsWith('/')) return `${API_URL}${iconUrl}`;
  return `${API_URL}/proxy/perk-icon?url=${encodeURIComponent(iconUrl)}`;
};

interface Perk {
  id: string;
  name: string;
  description: string;
  role: 'killer' | 'survivor';
  iconUrl: string | null;
}

interface GuessEntry {
  perk: Perk;
  correct: boolean;
}

interface RoleState {
  guesses: GuessEntry[];
  won: boolean;
  lost: boolean;
  revealedPerk: Perk | null;
}

// ── Perk Icon ─────────────────────────────────────────────────────────────────

const PerkIcon = ({ iconUrl, name, size = 'md', imageRotation = 0 }: { iconUrl: string | null; name: string; size?: 'sm' | 'md' | 'lg'; imageRotation?: number }) => {
  const [error, setError] = useState(false);
  const sizeClass = size === 'sm' ? 'size-14' : size === 'lg' ? 'size-44' : 'size-20';
  const iconClass = size === 'sm' ? 'text-3xl' : size === 'lg' ? 'text-6xl' : 'text-5xl';

  if (!iconUrl || error) {
    return (
      <div className={`${sizeClass} bg-void border border-blood/30 rounded flex items-center justify-center shrink-0`}>
        <span className={`material-symbols-outlined text-blood/40 ${iconClass}`}>diamond</span>
      </div>
    );
  }

  const full = perkIcon(iconUrl)!;
  return (
    <div
      className={`${sizeClass} shrink-0 relative`}
      style={{ backgroundImage: 'url(/perk_background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <img
        src={full}
        alt={name}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none"
        style={imageRotation ? { transform: `rotate(${imageRotation}deg)`, display: 'block' } : undefined}
        onError={() => setError(true)}
      />
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const PerksMode = () => {
  const [timeLeft, setTimeLeft] = useState(getBrasiliaTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getBrasiliaTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [role, setRole] = useState<'killer' | 'survivor'>('killer');
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [gameStates, setGameStates] = useState<Record<'killer' | 'survivor', RoleState>>(() => {
    return loadGameState('perks') || {
      killer:   { guesses: [], won: false, lost: false, revealedPerk: null },
      survivor: { guesses: [], won: false, lost: false, revealedPerk: null },
    };
  });

  // Save state on change
  useEffect(() => {
    saveGameState('perks', gameStates);
  }, [gameStates]);

  const [targetIcons, setTargetIcons] = useState<Record<'killer' | 'survivor', string | null>>({
    killer: null,
    survivor: null,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = gameStates[role];
  const isGameOver = current.won || current.lost;
  // Always visible but blurred if game not over
  const isBlurred = !isGameOver;

  // Fetch perk list and target icon when role changes
  useEffect(() => {
    const load = async () => {
      try {
        const [perksRes, targetRes] = await Promise.all([
          fetch(`${API_URL}/game/perk/perks?role=${role}`),
          fetch(`${API_URL}/game/perk/target?date=${getBrasiliaDate()}&role=${role}`)
        ]);
        
        if (perksRes.ok && targetRes.ok) {
          const perksData = await perksRes.json();
          const targetData = await targetRes.json();
          setAllPerks(perksData.perks || []);
          setTargetIcons(prev => ({ ...prev, [role]: targetData.iconUrl }));
        }
      } catch (e) {
        console.error('Error loading perks or target:', e);
      }
    };
    load();
  }, [role]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPerks = allPerks.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !current.guesses.some(g => g.perk.id === p.id)
  );

  const fetchReveal = async (): Promise<Perk | null> => {
    try {
      const res = await fetch(`${API_URL}/game/perk/reveal?date=${getBrasiliaDate()}&role=${role}`);
      if (res.ok) {
        const data = await res.json();
        return data.perk ?? null;
      }
    } catch (e) {
      console.error('Error fetching reveal:', e);
    }
    return null;
  };

  const handleSelect = async (perk: Perk) => {
    if (isGameOver) return;
    setSearchQuery('');
    setIsDropdownOpen(false);

    try {
      const res = await fetch(`${API_URL}/game/perk/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perkId: perk.id, role, date: getBrasiliaDate() }),
      });

      if (!res.ok) return;
      const result = await res.json();

      const newGuesses = [...current.guesses, { perk, correct: result.correct }];
      const won  = result.correct;
      const lost = !won && newGuesses.length >= MAX_ATTEMPTS;

      let revealedPerk = current.revealedPerk;
      if (lost && !revealedPerk) {
        revealedPerk = await fetchReveal();
      }

      setGameStates(prev => ({
        ...prev,
        [role]: { guesses: newGuesses, won, lost, revealedPerk },
      }));

      if (won || lost) {
        if (won) updateStreak();
        setShowModal(true);
      }
    } catch (e) {
      console.error('Error submitting guess:', e);
    }
  };

  const handleShare = () => {
    const today = getBrasiliaDate();
    const resultEmoji = current.guesses
      .map(g => g.correct ? '🟩' : '⬛')
      .join('');
    
    // Fill remaining attempts with empty boxes
    const remaining = '⬜'.repeat(MAX_ATTEMPTS - current.guesses.length);

    const text = `DBDLE Perks (${role.toUpperCase()}) - ${today}\n${current.guesses.length}/${MAX_ATTEMPTS}\n\n${resultEmoji}${remaining}\n\nhttps://dbdle.fun`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Results copied to clipboard!');
    });
  };

  // Determine icon to show in centerpiece (only show when not blurred or game over)
  const displayIcon = isGameOver
    ? (current.won ? current.guesses.at(-1)?.perk.iconUrl : current.revealedPerk?.iconUrl)
    : targetIcons[role];

  const displayName = isGameOver
    ? (current.won ? current.guesses.at(-1)?.perk.name : current.revealedPerk?.name)
    : 'perk';

  // Random rotation for the central perk image (stable while the image is the same)
  const [displayRotation, setDisplayRotation] = useState<number>(12);
  useEffect(() => {
    if (!displayIcon) return;
    // generate a random angle between 22 and 45 degrees, random sign
    const min = 22;
    const max = 45;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const angle = sign * (min + Math.floor(Math.random() * (max - min + 1)));
    setDisplayRotation(angle);
  }, [displayIcon]);

  return (
    <main className="flex-1 flex justify-center py-6 px-4 md:px-0 mx-auto w-full">
      <div className="layout-content-container flex flex-col max-w-2xl flex-1 gap-6">

        <div className="flex justify-end">
          <InfoButton mode="perks" />
        </div>

        {/* Result Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className={`max-w-sm w-full bg-card-dark border-2 ${current.won ? 'border-blood/50 shadow-[0_0_50px_rgba(138,3,3,0.3)]' : 'border-bone/10'} rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500`}>
              <div className={`relative h-48 flex items-center justify-center ${current.won ? 'bg-blood/10' : 'bg-bone/5'}`}>
                <PerkIcon
                  iconUrl={displayIcon ?? null}
                  name={displayName ?? 'perk'}
                  size="lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card-dark to-transparent" />
              </div>
              <div className="px-8 pb-10 pt-2 text-center">
                <h2 className={`text-3xl font-bold uppercase tracking-widest mb-2 font-display ${current.won ? 'text-blood animate-pulse' : 'text-bone/40'}`}>
                  {current.won ? 'Correct Perk!' : 'Lost in the Fog'}
                </h2>
                <div className="text-white text-xl font-bold mb-4 uppercase tracking-[0.2em]">
                  {displayName ?? '???'}
                </div>
                <div className={`h-px w-16 mx-auto mb-6 ${current.won ? 'bg-blood' : 'bg-bone/20'}`} />
                <p className="text-bone/70 text-sm tracking-widest uppercase mb-8 leading-loose">
                  {current.won
                    ? `Identified in ${current.guesses.length} ${current.guesses.length === 1 ? 'try' : 'tries'}.`
                    : 'The perk was revealed. Better luck tomorrow.'}
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleShare}
                    className="w-full btn-dbd flex items-center justify-center gap-3 bg-blood/20"
                  >
                    <span className="material-symbols-outlined">share</span>
                    Share Result
                  </button>

                  <button
                    onClick={() => { setRole(role === 'killer' ? 'survivor' : 'killer'); setShowModal(false); setSearchQuery(''); }}
                    className={`w-full btn-dbd flex items-center justify-center gap-3 ${current.won ? 'bg-blood hover:bg-blood/80 border-blood/50' : 'bg-bone/10 hover:bg-bone/20 border-bone/20'}`}
                  >
                    <span className="material-symbols-outlined">{role === 'killer' ? 'directions_run' : 'swords'}</span>
                    Try {role === 'killer' ? 'Survivor' : 'Killer'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full bg-card-dark hover:bg-white/5 text-bone/60 hover:text-bone font-bold py-3 rounded-xl transition-all cursor-pointer uppercase tracking-[0.2em] text-xs border border-white/5 hover:border-white/20"
                  >
                    See summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Tabs */}
        <div className="flex border-b border-blood/10 px-4 gap-8 justify-center">
          {(['killer', 'survivor'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setSearchQuery(''); setShowModal(false); }}
              className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 group transition-all cursor-pointer ${role === r ? 'border-blood text-bone' : 'border-transparent text-bone/40 hover:text-bone/80'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${role === r ? 'text-blood' : 'text-bone/40'}`}>
                  {r === 'killer' ? 'swords' : 'directions_run'}
                </span>
                <p className="text-sm font-bold leading-normal tracking-widest uppercase">{r}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Perk Centerpiece Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-b from-blood/20 to-transparent rounded-2xl blur-xl opacity-50" />
          <div className="relative bg-card-dark border border-blood/30 rounded-2xl shadow-2xl">

            {/* Icon */}
            <div className="p-8 flex flex-col items-center border-b border-blood/10 bg-gradient-to-b from-blood/5 to-transparent overflow-hidden">
              <div
                className="relative size-56 flex items-center justify-center cursor-default"
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Diamond + Icon container - keep original frame, rotate only the image */}
                <div key={role} className={`relative size-56 flex items-center justify-center transition-all duration-1000 ${isBlurred ? 'blur-[8px] brightness-[0.4] saturate-0' : 'blur-0 brightness-100 saturate-100'}`}>
                  {/* Simple Diamond Frame - keep frame but remove old purple fill */}
                  <div className="absolute inset-0 rotate-45 transform origin-center bg-transparent" />

                  {/* The Perk Icon: rotate only the inner image */}
                  <div className="relative z-10">
                    <PerkIcon iconUrl={displayIcon ?? null} name="perk" size="lg" imageRotation={displayRotation} />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center pointer-events-none select-none">
                <p className="text-[10px] font-bold text-bone/40 uppercase tracking-widest">
                  {isGameOver ? 'The Answer' : 'Identify this perk'}
                </p>
                {isGameOver && (
                  <p className="mt-2 text-white font-black uppercase tracking-wider">{displayName}</p>
                )}
              </div>
            </div>

            {/* Attempt dots */}
            <div className="px-8 pt-5 flex items-center gap-2 justify-center">
              {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                <div
                  key={i}
                  className={`size-2.5 rounded-full border transition-all duration-500 ${
                    i < current.guesses.length
                      ? current.guesses[i].correct
                        ? 'bg-green-600 border-green-600'
                        : 'bg-blood border-blood shadow-[0_0_8px_rgba(138,3,3,0.5)]'
                      : 'bg-transparent border-bone/20'
                  }`}
                />
              ))}
              <span className="ml-2 text-bone/40 text-[10px] font-bold uppercase tracking-widest">
                {current.guesses.length} / {MAX_ATTEMPTS}
              </span>
            </div>

            {/* Game over banner */}
            {isGameOver && (
              <div className={`mx-8 mt-4 mb-8 rounded-xl px-6 py-3 text-center text-sm font-bold uppercase tracking-widest ${current.won ? 'bg-green-900/30 text-green-400 border border-green-600/30' : 'bg-blood/10 text-blood border border-blood/20'}`}>
                {current.won
                  ? `Correct! "${current.guesses.at(-1)?.perk.name}"`
                  : `The perk was: "${displayName ?? '???'}"`}
              </div>
            )}

            {/* Search */}
            {!isGameOver && (
              <div className="px-8 py-6 relative" ref={dropdownRef}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-blood/50">search</span>
                  <input
                    type="text"
                    placeholder={`Search ${role} perks...`}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-void border border-blood/20 text-bone pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-blood/50 transition-all text-sm tracking-wider placeholder:text-bone/30"
                  />
                </div>

                {isDropdownOpen && searchQuery && (
                  <div className="absolute left-8 right-8 mt-2 bg-card-dark border border-blood/40 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                    {filteredPerks.length > 0 ? filteredPerks.map((p, i) => (
                      <button
                        key={p.id + i}
                        onClick={() => handleSelect(p)}
                        className="w-full text-left px-4 py-3 text-bone hover:bg-blood/20 transition-colors border-b border-blood/10 last:border-0 flex items-center gap-3 cursor-pointer"
                      >
                        <PerkIcon iconUrl={p.iconUrl} name={p.name} size="sm" />
                        <span className="text-sm font-medium">{p.name}</span>
                      </button>
                    )) : (
                      <div className="px-6 py-8 flex flex-col items-center gap-4">
                        <div className="size-10 loading-fog rounded-full"></div>
                        <div className="text-bone/40 italic text-sm text-center font-display tracking-widest">
                          Communing with the Entity...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guess history */}
        {current.guesses.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-center font-display text-[10px] tracking-[0.3em] uppercase text-blood/60">Attempts</h4>
            {current.guesses.map((entry, i) => (
              <div
                key={entry.perk.id + i}
                className={`flex items-center justify-between p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                  entry.correct ? 'bg-green-900/20 border-green-600/30' : 'bg-blood/10 border-blood/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <PerkIcon iconUrl={entry.perk.iconUrl} name={entry.perk.name} size="sm" />
                  <div>
                    <p className="text-bone font-bold text-sm">{entry.perk.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${entry.correct ? 'text-green-400' : 'text-blood'}`}>
                      {entry.correct ? 'Correct!' : 'Wrong'}
                    </p>
                  </div>
                </div>
                <span className={`material-symbols-outlined ${entry.correct ? 'text-green-400' : 'text-blood'}`}>
                  {entry.correct ? 'check_circle' : 'close'}
                </span>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-8 mb-16 text-center">
          <div className="flex justify-center border-t border-bone/5 pt-10 pb-10">
            <div className="text-center group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blood text-xl group-hover:scale-110 transition-transform scale-x-[-1]">schedule</span>
                <p className="text-[10px] font-black text-bone/30 uppercase tracking-widest">Next Perk</p>
              </div>
              <p className="text-bone text-3xl font-black italic tracking-tighter tabular-nums">{timeLeft}</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default PerksMode;

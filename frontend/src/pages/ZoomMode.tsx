import { useState, useEffect, useRef } from 'react';
import InfoButton from '../components/InfoButton';
import { getBrasiliaDate, getBrasiliaTimeLeft, saveGameState, loadGameState, updateStreak } from '../utils/gameStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const MAX_ATTEMPTS = 4;

interface Character {
  id: string;
  name: string;
  portraitUrl: string;
}

interface Guess {
  character: Character;
  correct: boolean;
}

interface ZoomTarget {
  portraitUrl: string | null;
  zoom: number;
  x: number;
  y: number;
  nextZoomLevel: number;
}

const PortraitIcon = ({ url, alt, role, size = "small" }: { url?: string, alt: string, role: string, size?: "small" | "large" }) => {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = size === "small" ? "size-10" : "size-32";
  
  if (!url || hasError) {
    return (
      <div className={`${sizeClasses} bg-void rounded border border-blood/20 flex items-center justify-center shrink-0`}>
        <span className="material-symbols-outlined text-blood/40">
          {role === 'killer' ? 'swords' : 'directions_run'}
        </span>
      </div>
    );
  }

  const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : url;
  return (
    <img 
      src={fullUrl} 
      alt={alt}
      className={`${sizeClasses} rounded object-cover shrink-0 border border-blood/10`}
      onError={() => setHasError(true)}
    />
  );
};

const ZoomMode = () => {
  const [timeLeft, setTimeLeft] = useState(getBrasiliaTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getBrasiliaTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [role, setRole] = useState<'killer' | 'survivor'>('killer');
  
  // Load combined state
  const savedState = loadGameState('zoom') || {
    guesses: { killer: [], survivor: [] },
    target: { killer: null, survivor: null }
  };

  const [guesses, setGuesses] = useState<Record<'killer' | 'survivor', Guess[]>>(savedState.guesses);
  const [target, setTarget] = useState<Record<'killer' | 'survivor', ZoomTarget | null>>(savedState.target);

  // Save state on change
  useEffect(() => {
    saveGameState('zoom', { guesses, target });
  }, [guesses, target]);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [revealedCharacter, setRevealedCharacter] = useState<Character | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const current = guesses[role];
  const currentTarget = target[role];
  const won = current.some(g => g.correct);
  const attempts = current.length;
  const lost = attempts >= MAX_ATTEMPTS && !won;
  const over = won || lost;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const today = getBrasiliaDate();
        
        // Fetch target for current attempt
        const targetRes = await fetch(`${API_URL}/game/zoom/target?date=${today}&role=${role}&attempt=${attempts + 1}`);
        if (targetRes.ok) {
          const targetData = await targetRes.json();
          setTarget(prev => ({ ...prev, [role]: targetData }));
        }

        // Fetch characters for autocomplete
        const charRes = await fetch(`${API_URL}/game/classic/characters?role=${role}`);
        if (charRes.ok) {
          const charData = await charRes.json();
          setCharacters(charData.characters);
        }
      } catch (err) {
        console.error("Error fetching zoom data:", err);
      }
    };

    fetchInitialData();
  }, [role, attempts]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (char: Character) => {
    if (over) return;
    setSearchQuery('');
    setIsDropdownOpen(false);

    try {
      const today = getBrasiliaDate();
      const res = await fetch(`${API_URL}/game/zoom/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: char.id,
          role,
          date: today,
          attempt: attempts + 1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const newGuess = { character: char, correct: data.correct };
        setGuesses(prev => ({
          ...prev,
          [role]: [...prev[role], newGuess]
        }));

        if (data.correct) {
          updateStreak();
          setRevealedCharacter(char);
          setShowResultModal(true);
        } else if (attempts + 1 >= MAX_ATTEMPTS) {
          const today = getBrasiliaDate();
          const revealRes = await fetch(`${API_URL}/game/zoom/reveal?date=${today}&role=${role}`);
          if (revealRes.ok) {
            const revealData = await revealRes.json();
            setRevealedCharacter(revealData.character);
          }
          setShowResultModal(true);
        }
      }
    } catch (err) {
      console.error("Error submitting guess:", err);
    }
  };

  const handleShare = () => {
    const today = getBrasiliaDate();
    const resultEmoji = current
      .map(g => g.correct ? '🟩' : '⬛')
      .join('');
    
    // Fill remaining attempts with empty boxes
    const remaining = '⬜'.repeat(MAX_ATTEMPTS - current.length);

    const text = `DBDLE Zoom (${role.toUpperCase()}) - ${today}\n${current.length}/${MAX_ATTEMPTS}\n\n${resultEmoji}${remaining}\n\nhttps://dbdle.fun`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Results copied to clipboard!');
    });
  };

  const filtered = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !current.some(g => g.character.id === c.id)
  );

  const displayIcon = over ? currentTarget?.portraitUrl : currentTarget?.portraitUrl;
  const zoomLevel = over ? 100 : (currentTarget?.zoom || 700);
  const posX = currentTarget?.x || 50;
  const posY = currentTarget?.y || 50;

  return (
    <main className="flex-1 flex justify-center py-6 px-4 md:px-0 mx-auto w-full transition-all duration-1000">
      <div className="layout-content-container flex flex-col max-w-[500px] flex-1 gap-6">
        <div className="flex justify-end">
          <InfoButton mode="zoom" />
        </div>
        
        {/* Role Tabs */}
        <div className="flex border-b border-blood/10 px-4 gap-8 justify-center">
          {['killer', 'survivor'].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r as any); setSearchQuery(''); }}
              className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 group transition-all cursor-pointer ${role === r ? 'border-blood text-bone' : 'border-transparent text-bone/40 hover:text-bone/80'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${role === r ? 'text-blood' : 'text-bone/40'}`}>
                  {r === 'killer' ? 'swords' : 'directions_run'}
                </span>
                <p className="text-[10px] font-bold leading-normal tracking-widest uppercase">{r}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Progress Section */}
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-card-dark border border-blood/10 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-bone/40 text-[10px] font-bold uppercase tracking-widest">Progress</p>
              <p className="text-bone text-lg font-black italic">Attempt {attempts + (over ? 0 : 1)} of {MAX_ATTEMPTS}</p>
            </div>
            <div className="text-right">
              <p className="text-blood text-[10px] font-bold uppercase tracking-widest">Current Zoom</p>
              <p className="text-bone text-lg font-black italic tracking-wider">{zoomLevel}%</p>
            </div>
          </div>
          <div className="relative w-full h-2 bg-void/60 rounded-full overflow-hidden border border-white/5">
            <div 
              className="absolute top-0 left-0 h-full bg-blood shadow-[0_0_10px_rgba(138,3,3,0.5)] transition-all duration-1000" 
              style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Zoomed Image Card - Shrinked */}
        <div className="relative group">
          <div className="aspect-square w-full bg-void rounded-2xl overflow-hidden border-2 border-blood/20 shadow-2xl relative">
            {displayIcon && (
              <div 
                key={role}
                className="absolute inset-0 bg-no-repeat transition-all duration-1000 ease-in-out" 
                style={{ 
                  backgroundImage: `url('${displayIcon.startsWith('/') ? API_URL + displayIcon : displayIcon}')`, 
                  backgroundSize: `${zoomLevel}%`, 
                  backgroundPosition: `${posX}% ${posY}%` 
                }}
              ></div>
            )}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]"></div>
            <div className="absolute top-4 right-4 bg-blood/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-lg uppercase tracking-widest italic border border-white/10">
              {zoomLevel}% ZOOM
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-10 scanline z-10"></div>
          </div>
        </div>

        {/* Search Bar - No description as requested */}
        {!over && (
          <div className="w-full relative z-50" ref={dropdownRef}>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-blood/50 group-focus-within:text-blood transition-colors">search</span>
              <input
                type="text"
                placeholder={`GUESS THE ${role.toUpperCase()}...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-card-dark/80 backdrop-blur-md border border-blood/20 text-bone pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-blood/50 transition-all text-sm tracking-wider placeholder:text-bone/30 uppercase"
              />
            </div>

            {isDropdownOpen && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-blood/40 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {filtered.length > 0 ? filtered.map((char, i) => (
                  <button
                    key={char.id + i}
                    onClick={() => handleSelect(char)}
                    className="w-full text-left px-4 py-3 text-bone hover:bg-blood/20 transition-colors border-b border-blood/10 last:border-0 flex items-center gap-3 cursor-pointer"
                  >
                    <PortraitIcon url={char.portraitUrl} alt={char.name} role={role} size="small" />
                    <span className="text-sm font-medium uppercase tracking-tight">{char.name}</span>
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

        {/* Previous Guesses - Perks Style */}
        {current.length > 0 && (
          <div className="flex flex-col gap-3">
             <h4 className="text-center font-display text-[10px] tracking-[0.3em] uppercase text-blood/60">Attempts</h4>
            {current.map((g, i) => (
              <div 
                key={g.character.id + i}
                className={`flex items-center justify-between p-3 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                  g.correct ? 'bg-green-900/20 border-green-600/30' : 'bg-blood/10 border-blood/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <PortraitIcon url={g.character.portraitUrl} alt={g.character.name} role={role} />
                  <div>
                    <p className="text-bone font-bold text-sm uppercase">{g.character.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${g.correct ? 'text-green-400' : 'text-blood'}`}>
                      {g.correct ? 'Entity Revealed' : 'Incorrect'}
                    </p>
                  </div>
                </div>
                <span className={`material-symbols-outlined ${g.correct ? 'text-green-400' : 'text-blood'}`}>
                  {g.correct ? 'check_circle' : 'close'}
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
                <p className="text-[10px] font-black text-bone/30 uppercase tracking-widest">Next Character</p>
              </div>
              <p className="text-bone text-3xl font-black italic tracking-tighter tabular-nums">{timeLeft}</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Result Modal - Simple Version */}
      {showResultModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className={`max-w-md w-full bg-card-dark border-2 border-blood/50 shadow-2xl rounded-3xl overflow-hidden p-8 text-center`}>
            <h2 className={`text-4xl font-black uppercase tracking-widest mb-4 ${won ? 'text-green-500' : 'text-blood'}`}>
              {won ? 'You Won' : 'You Lost'}
            </h2>
            <div className="flex justify-center mb-6">
              <PortraitIcon url={revealedCharacter?.portraitUrl || undefined} alt="Answer" role={role} size="large" />
            </div>
            <p className="text-bone/50 text-xs uppercase tracking-[0.3em] font-display mb-2">
              The character was
            </p>
            <p className="text-3xl font-black text-bone uppercase tracking-widest mb-6 font-display">
              {revealedCharacter?.name || '???'}
            </p>
            <button 
              onClick={handleShare}
              className="w-full btn-dbd flex items-center justify-center gap-3 bg-blood/20 mb-3"
            >
              <span className="material-symbols-outlined">share</span>
              Share Result
            </button>
            <button 
              onClick={() => setShowResultModal(false)}
              className="w-full btn-dbd"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default ZoomMode;

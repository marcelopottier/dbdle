import { useState, useEffect, useRef } from 'react';
import InfoButton from '../components/InfoButton';
import { getBrasiliaDate, getBrasiliaTimeLeft, saveGameState, loadGameState, updateStreak } from '../utils/gameStorage';

interface Character {
  id: string;
  name: string;
  portraitUrl?: string;
  // Extended fields for hits/reveal
  role?: string;
  gender?: string;
  origin?: string;
  chapter?: number;
  releaseYear?: number;
  moveSpeed?: number;
  terrorRadius?: number;
  powerCategory?: string;
  difficulty?: string;
}

interface GuessResult {
  attribute: string;
  guessedValue: string | number | null;
  correctValue: string | number | null;
  status: "correct" | "higher" | "lower" | "partial" | "wrong";
}

interface GuessHistory {
  character: Character;
  results: GuessResult[];
  correct: boolean;
}

const AttributeCard = ({ result, label, delay = 0 }: { result: GuessResult; label?: string; delay?: number }) => {
  const [revealed, setRevealed] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setRevealed(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);
  const getBgColor = () => {
    switch (result.status) {
      case "correct": return "bg-[#27ae60]";
      case "partial":
      case "higher":
      case "lower": return "bg-[#f39c12]";
      default: return "bg-[#c0392b]";
    }
  };

  const getIcon = () => {
    switch (result.status) {
      case "correct": return "check_circle";
      case "higher": return "arrow_upward";
      case "lower": return "arrow_downward";
      case "partial": return "hourglass_bottom";
      default: return "cancel";
    }
  };

  const formatValue = (val: string | number | null) => {
    if (val === null) return 'N/A';
    if (result.attribute === 'moveSpeed') return `${val}m/s`;
    if (result.attribute === 'terrorRadius') return `${val}m`;
    return val;
  };

  return (
    <div 
      className={`h-full w-full ${getBgColor()} rounded-lg flex flex-col items-center justify-center text-white font-bold text-xs shadow-lg text-center p-1 min-h-[80px] transition-all duration-1000 ${
        revealed ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-y-90'
      }`}
      style={{ perspective: '1000px' }}
    >
      <span className="material-symbols-outlined mb-1">{getIcon()}</span>
      <span className="uppercase tracking-tighter leading-tight">
        {formatValue(result.guessedValue)}
      </span>
      {label && <span className="text-[10px] opacity-60 uppercase mt-0.5">{label}</span>}
    </div>
  );
};

const CharacterPortrait = ({ url, alt, role, size = "small" }: { url?: string, alt: string, role: string, size?: "small" | "large" }) => {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = size === "small" ? "size-10" : "size-32 md:size-40";
  const iconSize = size === "small" ? "text-xl" : "text-5xl";

  if (!url || hasError) {
    return (
      <div className={`${sizeClasses} rounded shadow-md border border-blood/30 bg-card-dark flex items-center justify-center flex-shrink-0 z-10`}>
        <span className={`material-symbols-outlined text-bone/50 ${iconSize}`}>
          {role === 'killer' ? 'swords' : 'directions_run'}
        </span>
      </div>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
  const fullUrl = url.startsWith('/') ? `${apiUrl}${url}` : url;

  return (
    <img 
      src={fullUrl} 
      alt={alt}
      className={`${sizeClasses} rounded shadow-md border border-blood/30 object-cover flex-shrink-0 bg-card-dark z-10`}
      onError={() => setHasError(true)}
    />
  );
};

interface RoleState {
  guesses: GuessHistory[];
  hintsUsed: number;
  targetData: Character | null;
}

const MAX_ATTEMPTS = 8;

const ClassicMode = () => {
  const [gameStates, setGameStates] = useState<Record<'killer' | 'survivor', RoleState>>(() => {
    return loadGameState('classic') || {
      killer: { guesses: [], hintsUsed: 0, targetData: null },
      survivor: { guesses: [], hintsUsed: 0, targetData: null },
    };
  });

  // Save state on change
  useEffect(() => {
    saveGameState('classic', gameStates);
  }, [gameStates]);

  const [timeLeft, setTimeLeft] = useState(getBrasiliaTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getBrasiliaTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const [role, setRole] = useState<'killer' | 'survivor'>('killer');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to access current state
  const currentState = gameStates[role];
  const hasWon = currentState.guesses.some(g => g.correct);
  const hasLost = currentState.guesses.length >= MAX_ATTEMPTS && !hasWon;
  const isGameOver = hasWon || hasLost;

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const response = await fetch(`${url}/game/classic/characters?role=${role}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setCharacters(data);
          } else if (data && Array.isArray(data.characters)) {
            setCharacters(data.characters);
          } else {
            setCharacters([]);
            console.error("Unexpected API response format:", data);
          }
        } else {
          console.error("Failed to fetch characters");
        }
      } catch (error) {
        console.error("Error fetching characters:", error);
      }
    };

    fetchCharacters();
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    !currentState.guesses.some(g => g.character.id === c.id)
  );

  const handleShowHint = async () => {
    if (currentState.hintsUsed >= 2 || isGameOver) return;

    try {
      let target = currentState.targetData;
      if (!target) {
        const url = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const today = getBrasiliaDate();
        const response = await fetch(`${url}/game/classic/reveal?date=${today}&role=${role}`);
        
        if (response.ok) {
          const result = await response.json();
          target = result.character;
        } else {
          console.error("Failed to fetch reveal data");
          return;
        }
      }
      
      setGameStates(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          targetData: target,
          hintsUsed: prev[role].hintsUsed + 1
        }
      }));
    } catch (error) {
      console.error("Error fetching hint:", error);
    }
  };

  const getHintValue = (index: number) => {
    if (!currentState.targetData) return null;
    if (role === 'killer') {
      return index === 0 ? `Power: ${currentState.targetData.powerCategory}` : `Radius: ${currentState.targetData.terrorRadius}m`;
    } else {
      return index === 0 ? `Difficulty: ${currentState.targetData.difficulty}` : `Origin: ${currentState.targetData.origin}`;
    }
  };

  const handleSelectCharacter = async (character: Character) => {
    if (isGameOver) return;
    setSearchQuery('');
    setIsDropdownOpen(false);
    
    try {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:8081';
      const today = getBrasiliaDate();
      
      const response = await fetch(`${url}/game/classic/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          role,
          date: today
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // If we lost, we need target data to show the reveal
        let target = currentState.targetData;
        if (!target && currentState.guesses.length + 1 >= MAX_ATTEMPTS && !result.correct) {
          try {
            const revealRes = await fetch(`${url}/game/classic/reveal?date=${getBrasiliaDate()}&role=${role}`);
            if (revealRes.ok) {
              const revealData = await revealRes.json();
              target = revealData.character;
            }
          } catch (e) {
            console.error("Error fetching reveal after loss:", e);
          }
        }

        setGameStates(prev => ({
          ...prev,
          [role]: {
            ...prev[role],
            targetData: target,
            guesses: [{
              character,
              results: result.results,
              correct: result.correct
            }, ...prev[role].guesses]
          }
        }));
        
        if (result.correct || currentState.guesses.length + 1 >= MAX_ATTEMPTS) {
          if (result.correct) {
            updateStreak();
          }
          // Delay modal to wait for staggered animation (approx 3.5s)
          setTimeout(() => setShowResultModal(true), 3500);
        }
      } else {
        console.error("Failed to submit guess");
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
    }
  };

  const handleShare = () => {
    const today = getBrasiliaDate();
    const resultEmoji = currentState.guesses
      .map(g => g.results.map(r => {
        if (r.status === 'correct') return '🟩';
        if (r.status === 'partial' || r.status === 'higher' || r.status === 'lower') return '🟨';
        return '⬛';
      }).join(''))
      .reverse()
      .join('\n');

    const text = `DBDLE Classic (${role.toUpperCase()}) - ${today}\n${currentState.guesses.length}/${MAX_ATTEMPTS}\n\n${resultEmoji}\n\nhttps://dbdle.fun`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Results copied to clipboard!');
    });
  };
  // Fog Vignette intensity (0 to 1)
  const fogIntensity = Math.min(currentState.guesses.length / MAX_ATTEMPTS, 1);

  return (
    <main className="flex-1 flex justify-center py-6 px-4 md:px-0 mx-auto w-full relative overflow-hidden">
      
      {/* Fog Vignette Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
        style={{ 
          background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${fogIntensity * 0.7}) 100%)`,
          opacity: fogIntensity > 0 ? 1 : 0
        }}
      />

      <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 relative z-10">
        <div className="w-full flex justify-end">
          <InfoButton mode="classic" />
        </div>
        
        {/* Result Modal (Victory or Defeat) */}
        {showResultModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className={`max-w-md w-full bg-card-dark border-2 ${hasWon ? 'border-blood/50 shadow-[0_0_50px_rgba(138,3,3,0.3)]' : 'border-bone/10 shadow-2xl'} rounded-3xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500`}>
              <div className={`relative h-56 flex items-center justify-center ${hasWon ? 'bg-blood/10' : 'bg-bone/5'}`}>
                {/* Show the character portrait */}
                {(hasWon || hasLost) && (hasWon ? currentState.guesses[0].character : currentState.targetData) && (
                  <CharacterPortrait 
                    url={hasWon ? currentState.guesses[0].character.portraitUrl : currentState.targetData?.portraitUrl} 
                    alt={hasWon ? currentState.guesses[0].character.name : currentState.targetData?.name || ''} 
                    role={role}
                    size="large"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card-dark to-transparent"></div>
              </div>
              
              <div className="px-8 pb-10 pt-2 text-center">
                <h2 className={`text-4xl font-bold uppercase tracking-widest mb-2 font-display ${hasWon ? 'text-blood animate-pulse' : 'text-bone/40'}`}>
                  {hasWon ? 'Character Found!' : 'Lost in the Fog'}
                </h2>
                <div className="text-white text-2xl font-bold mb-4 uppercase tracking-[0.2em]">
                  {hasWon ? currentState.guesses[0].character.name : currentState.targetData?.name || 'Unknown'}
                </div>
                <div className={`h-px w-20 mx-auto mb-6 ${hasWon ? 'bg-blood' : 'bg-bone/20'}`}></div>
                <p className="text-bone/80 text-sm tracking-widest uppercase mb-8 leading-loose">
                  {hasWon 
                    ? `You successfully identified the ${role} in ${currentState.guesses.length} ${currentState.guesses.length === 1 ? 'try' : 'tries'}.`
                    : `The fog has claimed you. The ${role} of the day was revealed.`}
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
                    onClick={() => {
                      setRole(role === 'killer' ? 'survivor' : 'killer');
                      setShowResultModal(false);
                      setSearchQuery('');
                    }}
                    className={`w-full btn-dbd flex items-center justify-center gap-3 ${
                      hasWon 
                      ? 'bg-blood hover:bg-blood/80 border-blood/50' 
                      : 'bg-bone/10 hover:bg-bone/20 border-bone/20'
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {role === 'killer' ? 'directions_run' : 'swords'}
                    </span>
                    Try {role === 'killer' ? 'Survivor' : 'Killer'}
                  </button>

                  <button 
                    onClick={() => setShowResultModal(false)}
                    className="w-full bg-card-dark hover:bg-white/5 text-bone/60 hover:text-bone font-bold py-3 rounded-xl transition-all cursor-pointer uppercase tracking-[0.2em] text-xs border border-white/5 hover:border-white/20"
                  >
                    See summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Search Section */}
        <div className="flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Role Tabs - ALWAYS VISIBLE */}
          <div className="mb-2">
            <div className="flex border-b border-blood/10 px-4 gap-8 justify-center">
              <button 
                onClick={() => {
                  setRole('killer');
                  setSearchQuery('');
                  setShowResultModal(false); // Close modal if switching
                }}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 group transition-all cursor-pointer ${role === 'killer' ? 'border-blood text-bone' : 'border-transparent text-bone/40 hover:text-bone/80'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${role === 'killer' ? 'text-blood' : 'text-bone/40'}`}>swords</span>
                  <p className="text-sm font-bold leading-normal tracking-widest">KILLER</p>
                </div>
              </button>
              <button 
                onClick={() => {
                  setRole('survivor');
                  setSearchQuery('');
                  setShowResultModal(false); // Close modal if switching
                }}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 group transition-all cursor-pointer ${role === 'survivor' ? 'border-blood text-bone' : 'border-transparent text-bone/40 hover:text-bone/80'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${role === 'survivor' ? 'text-blood' : 'text-bone/40'}`}>directions_run</span>
                  <p className="text-sm font-bold leading-normal tracking-widest">SURVIVOR</p>
                </div>
              </button>
            </div>
          </div>

          {/* Game Over Indicator */}
          {isGameOver && (
            <div className={`border rounded-2xl px-12 py-6 text-center shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-500 flex flex-col items-center ${
              hasWon ? 'bg-blood/10 border-blood/30' : 'bg-bone/5 border-bone/10'
            }`}>
              <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 ${hasWon ? 'text-blood' : 'text-bone/40'}`}>
                <span className="material-symbols-outlined text-sm">{hasWon ? 'stars' : 'skull'}</span>
                {hasWon ? 'Status: Escaped Nightmare' : 'Status: Claimed by Fog'}
              </div>
              <div className="text-bone font-bold uppercase tracking-[0.2em] text-2xl mb-1">
                {hasWon ? currentState.guesses[0].character.name : currentState.targetData?.name}
              </div>
              <div className="text-bone/40 text-[10px] uppercase tracking-widest">
                {hasWon ? `Puzzle Solved in ${currentState.guesses.length} attempts` : 'Maximum attempts reached'}
              </div>
            </div>
          )}

          {/* Revealed Hints Display */}
          {currentState.hintsUsed > 0 && (
            <div className="flex gap-4 animate-in fade-in zoom-in duration-500">
              {[...Array(currentState.hintsUsed)].map((_, i) => (
                <div key={i} className="bg-blood text-white px-6 py-3 rounded-xl border border-white/20 shadow-lg text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  {getHintValue(i)}
                </div>
              ))}
            </div>
          )}

          {/* Search Bar - ONLY SHOW IF NOT OVER */}
          {!isGameOver && (
            <div className="px-4 py-2 max-w-2xl mx-auto w-full relative z-50 flex flex-col items-center gap-4" ref={dropdownRef}>
              
              {/* Attempt Counter */}
              <div className="flex gap-2 items-center mb-2">
                {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`size-2.5 rounded-full transition-all duration-500 border ${
                      i < currentState.guesses.length 
                      ? 'bg-blood border-blood shadow-[0_0_8px_rgba(138,3,3,0.5)] scale-110' 
                      : 'bg-transparent border-bone/20'
                    }`}
                  />
                ))}
                <span className="ml-3 text-bone/40 text-[10px] font-bold uppercase tracking-widest">
                  Guess {currentState.guesses.length} / {MAX_ATTEMPTS}
                </span>
              </div>

              <div className="w-full max-w-xl relative">
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-blood/50 group-focus-within:text-blood transition-colors">search</span>
                  <input
                    type="text"
                    placeholder={`GUESS THE ${role === 'killer' ? 'KILLER' : 'SURVIVOR'}...`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-card-dark/80 backdrop-blur-md border border-blood/20 text-bone px-16 py-5 rounded-2xl focus:outline-none focus:border-blood/50 focus:ring-4 focus:ring-blood/10 transition-all text-lg tracking-widest font-medium uppercase placeholder:text-bone/20"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-blood/40 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {filteredCharacters.length > 0 ? (
                      filteredCharacters.map((char, index) => (
                        <button 
                          key={char.id || index}
                          onClick={() => handleSelectCharacter(char)}
                          className="w-full text-left px-6 py-3 text-bone font-medium hover:bg-blood/20 transition-colors border-b border-blood/10 last:border-0 hover:text-white flex items-center gap-4 cursor-pointer"
                        >
                          <CharacterPortrait url={char.portraitUrl} alt={char.name} role={role} />
                          <span className="text-lg">{char.name}</span>
                        </button>
                      ))
                    ) : (
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
            </div>
          )}
        </div>

        {/* Guess Table */}
        {currentState.guesses.length > 0 && (
          <div className="px-4 py-8 @container overflow-x-auto relative z-10 transition-all duration-1000">
            <div className="min-w-[1000px]">
              <table className="w-full border-separate border-spacing-2">
                <thead>
                  {role === 'killer' ? (
                    <tr>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-16">Name</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-20">Gender</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-24">Origin</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-32">Chapter</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-20">Year</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-24">Speed</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-24">Radius</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-32">Power Type</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-16">Name</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-20">Gender</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-24">Origin</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-32">Chapter</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-20">Year</th>
                      <th className="px-2 py-3 text-center text-bone/40 text-[10px] font-bold tracking-tighter uppercase w-32">Difficulty</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {currentState.guesses.map((guess, idx) => (
                    <tr key={guess.character.id + idx} className="group animate-in fade-in slide-in-from-top-4 duration-500">
                      <td className="h-20 p-1">
                        <div className="h-full w-full bg-card-dark border border-blood/20 rounded-lg flex flex-col items-center justify-center p-1">
                          <CharacterPortrait url={guess.character.portraitUrl} alt={guess.character.name} role={role} />
                          <span className="text-[10px] text-bone mt-1 font-bold truncate w-full text-center">{guess.character.name}</span>
                        </div>
                      </td>
                      {guess.results.map((res: GuessResult, rIdx: number) => (
                        <td key={rIdx} className="h-20 p-1">
                          <AttributeCard 
                            result={res} 
                            label={role === 'killer' ? (rIdx === 4 ? 'm/s' : rIdx === 5 ? 'meters' : '') : ''}
                            delay={idx === 0 ? rIdx * 400 : 0}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend/Help */}
        <div className="mt-8 px-4 flex flex-wrap justify-center gap-6 text-bone/40 text-xs uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <div className="size-3 bg-[#27ae60] rounded-sm"></div> Correct
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-[#f39c12] rounded-sm"></div> Partial / Near
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-[#c0392b] rounded-sm"></div> Wrong
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span> Higher
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">arrow_downward</span> Lower
          </div>
        </div>

        {/* Footer / Hint Area */}
        <div className="mt-12 mb-10 text-center px-4 relative z-10">
          <p className="text-bone/40 italic text-sm mb-4">"The Entity hungers for a new victim..."</p>
          <button 
            onClick={handleShowHint}
            disabled={currentState.hintsUsed >= 2 || isGameOver}
            className={`font-bold py-3 px-8 rounded-xl transition-all shadow-xl uppercase tracking-widest text-sm border ${
              currentState.hintsUsed >= 2 || isGameOver
              ? 'bg-card-dark text-bone/20 border-blood/10 cursor-not-allowed'
              : 'bg-blood hover:bg-blood/80 text-white shadow-blood/20 border-blood/50 hover:border-white/50 cursor-pointer'
            }`}
          >
            {currentState.hintsUsed === 0 ? 'Show Hint (2 left)' : currentState.hintsUsed === 1 ? 'Show Hint (1 left)' : 'No Hints Left'}
          </button>
        </div>

        <footer className="mt-8 mb-16 text-center relative z-10">
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
    </main>
  );
};

export default ClassicMode;

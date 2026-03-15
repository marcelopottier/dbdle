
import { Link } from 'react-router-dom';
import { getStreak } from '../utils/gameStorage';

const ModeCard = ({ icon, title, description, to }: { icon: string, title: string, description: string, to: string }) => (
  <div className="group relative flex flex-col border border-blood/20 bg-void/40 p-8 rounded-3xl transition-all hover:border-blood/60 hover:shadow-[0_0_40px_rgba(192,57,43,0.1)] overflow-hidden backdrop-blur-sm">
    <div className="absolute inset-0 bg-blood/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    <div className="relative z-10">
      <div className="mb-6 flex justify-between items-start">
        <span className="material-symbols-outlined text-blood text-5xl group-hover:scale-110 transition-transform">{icon}</span>
        <div className="h-6 w-6 border-t border-r border-blood/20 rounded-tr-lg group-hover:border-blood/60 transition-colors"></div>
      </div>
      <h3 className="font-display text-4xl font-bold tracking-wider text-bone uppercase mb-4">{title}</h3>
      <p className="font-sans text-xs text-bone/50 tracking-wide leading-relaxed mb-8 h-10 group-hover:text-bone/80 transition-colors">{description}</p>
      <Link to={to} className="w-full btn-dbd text-center inline-block">
        Enter Realm
      </Link>
      <div className="absolute -bottom-4 -right-4 h-6 w-6 border-b border-r border-blood/20 rounded-br-lg group-hover:border-blood/60 transition-colors"></div>
    </div>
  </div>
);

const Home = () => {
  const streak = getStreak();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-20 mx-auto w-full">
      <div className="mb-16 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-blood text-sm animate-pulse">local_fire_department</span>
          <span className="font-display text-blood/80 text-xs tracking-[0.3em] uppercase">Current Streak: {streak} Days</span>
        </div>
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-widest text-blood uppercase dbdle-glow">
          Dead By Daylight
        </h2>
        <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.2em] text-bone uppercase mt-2">
          Guessing Game
        </h3>
        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-blood"></div>
          <span className="font-display text-bone/80 text-sm tracking-[0.3em] uppercase">The Entity Awaits</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-blood"></div>
        </div>
      </div>

      {/* Mode Grid (2x2) */}
      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
        <ModeCard
          icon="skull"
          title="Classic"
          description="Identify the mystery character based on their unique attributes and history."
          to="/classic"
        />
        <ModeCard
          icon="diamond"
          title="Perks"
          description="Guess the correct character perk by its icon and hidden description clues."
          to="/perks"
        />
        <ModeCard
          icon="zoom_in"
          title="Zoom"
          description="A close encounter with a pixelated character. Can you recognize them up close?"
          to="/zoom"
        />
        <ModeCard
          icon="grid_view"
          title="Connections"
          description="Group 16 perks into 4 hidden categories. How well do you know the fog?"
          to="/connections"
        />
      </div>
    </main>
  );
};

export default Home;

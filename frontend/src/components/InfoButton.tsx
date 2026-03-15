import { useState } from 'react';

const INFO_TEXTS: Record<string, string> = {
  connections: `Select four perks that you think belong to the same hidden theme. Submit when you have 4 selections. If correct, the group is revealed. You have 4 mistakes total. You can use the Shuffle button to mix the perks.`,
  classic: `Discover the character by attributes.`,
  perks: `Find the specific perk by its image.`,
  zoom: `Identify the character from a zoomed image.`,
};

const InfoButton = ({ mode = 'connections' }: { mode?: string }) => {
  const [open, setOpen] = useState(false);
  const text = INFO_TEXTS[mode] ?? INFO_TEXTS.connections;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(s => !s)}
        className="px-3 py-2 rounded-xl border border-bone/10 bg-card-dark text-bone/60 hover:text-bone hover:border-blood/30 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
        aria-expanded={open}
        aria-controls="mode-info"
      >
        <span className="material-symbols-outlined">info</span>
        Info
      </button>

      {open && (
        <div
          id="mode-info"
          role="dialog"
          aria-modal="false"
          className="absolute right-0 mt-2 w-80 bg-void/90 border border-bone/10 rounded-xl p-4 text-sm text-bone shadow-lg z-50"
        >
          <div className="flex items-start gap-3">
            <div className="text-bone/50 text-xs font-bold uppercase tracking-widest">How to play</div>
            <button onClick={() => setOpen(false)} className="ml-auto text-bone/40">✕</button>
          </div>
          <p className="mt-3 text-[13px] leading-snug">{text}</p>
        </div>
      )}
    </div>
  );
};

export default InfoButton;

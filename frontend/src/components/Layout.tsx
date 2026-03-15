
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/classic', icon: 'skull', label: 'Classic' },
    { to: '/perks', icon: 'diamond', label: 'Perks' },
    { to: '/zoom', icon: 'zoom_in', label: 'Zoom' },
    { to: '/connections', icon: 'grid_view', label: 'Connections' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Background Textures */}
      <div className="fixed inset-0 grime-texture pointer-events-none"></div>
      <div className="fixed inset-0 fog-overlay pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-blood/20 bg-void/90 px-6 py-4 backdrop-blur-md lg:px-20">
        <div className="flex items-center">
          <Link to="/" className="group flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            {/* Brand Mark */}
            <div className="relative">
              <h1 className="font-display text-3xl font-bold tracking-[0.3em] uppercase leading-none">
                <span className="text-blood">DB</span>
                <span className="text-bone/30 mx-[1px]">/</span>
                <span className="text-bone">DLE</span>
              </h1>
              <span className="block text-[7px] font-display tracking-[0.5em] text-bone/30 uppercase text-right -mt-0.5">
                Dead by Daylight
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex flex-col items-center gap-1 transition-all hover:scale-110 ${
                location.pathname === link.to ? 'text-blood' : 'text-bone/60 hover:text-blood'
              }`}
            >
              <span className="material-symbols-outlined group-hover:animate-pulse">{link.icon}</span>
              <span className="font-display text-[10px] font-bold tracking-[0.2em] uppercase">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col items-center justify-center gap-1.5 p-2 cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-bone transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-bone transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-bone transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </header>

      {/* Mobile Menu Panel */}
      <div className={`md:hidden fixed inset-x-0 top-[73px] z-50 bg-void/95 backdrop-blur-xl border-b border-blood/20 transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <nav className="flex flex-col py-4">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-4 px-8 py-4 transition-colors ${
                location.pathname === link.to
                  ? 'text-blood bg-blood/10 border-l-2 border-blood'
                  : 'text-bone/60 hover:text-bone hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              <span className="font-display text-sm font-bold tracking-[0.2em] uppercase">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Backdrop overlay when menu is open */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
          <Outlet />
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-blood/20 bg-void/95 py-6 px-6 lg:px-20 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
        <div className="text-sm text-bone/40">© {new Date().getFullYear()} DBDLE</div>
        <div>
          <a
            href="https://github.com/marcelopottier"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Meu GitHub"
            className="text-bone/60 hover:text-bone/90"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="inline-block">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.135-.303-.54-1.527.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.649.24 2.873.12 3.176.765.84 1.23 1.911 1.23 3.221 0 4.61-2.805 5.625-5.475 5.92.429.369.81 1.096.81 2.21 0 1.595-.015 2.877-.015 3.267 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297 24 5.67 18.627.297 12 .297z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

'use client';

interface SidebarProps {
  view: string;
  onNavigate: (view: string) => void;
  onNewGame: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'library', label: 'Library', icon: '◫' },
  { id: 'templates', label: 'Templates', icon: '⊟' },
];

export default function Sidebar({ view, onNavigate, onNewGame }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-tk-card border-r border-tk-border flex flex-col z-20">
      <div className="p-5 border-b border-tk-border">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-tk-red">Atlas</span>
          <span className="text-white">Vault</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">TikTok Trivia Studio</p>
      </div>

      <button
        onClick={onNewGame}
        className="mx-4 mt-4 py-2.5 rounded-lg bg-tk-red text-white text-sm font-semibold hover:bg-red-500 transition-colors"
      >
        + New Game
      </button>

      <nav className="flex-1 px-2 mt-4 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              view === item.id
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-tk-border">
        <p className="text-xs text-zinc-600">Local — runs on your machine</p>
      </div>
    </aside>
  );
}

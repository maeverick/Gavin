import React, { useState } from 'react';
import {
  MessageSquare, BookOpen, Layers, CheckSquare, BarChart2,
  Calendar, Scale, ChevronLeft, ChevronRight, Plus, Sun, Moon, LogOut, Clock,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { signOut } from '../lib/auth';
import ConfirmModal from './ConfirmModal';

const timeAgo = (ts) => {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const modules = [
  { id: 'chat',       name: 'Gavin Chat',     icon: MessageSquare },
  { id: 'quizzes',    name: 'Quizzes',        icon: CheckSquare },
  { id: 'flashcards', name: 'Flashcards',     icon: Layers },
  { id: 'notes',      name: 'Study Center',   icon: BookOpen },
  { id: 'planner',    name: 'Study Planner',  icon: Calendar },
  { id: 'analytics',  name: 'Study Analytics',icon: BarChart2 },
];

const Sidebar = ({ activeModule, setActiveModule, isOpen, setIsOpen, onNewChat, isMobile, user, onOpenProfile, sessions = [], activeSessionId, onSelectSession }) => {
  const { theme, toggleTheme } = useTheme();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'GA';

  const mobileClass = isMobile
    ? `fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `relative z-10 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-[68px]'}`;

  return (
    <>
    <aside className={`bg-bg-tertiary border-r border-border flex flex-col h-screen ${mobileClass}`}>

      {/* Branding */}
      <div className="flex items-center justify-between px-4 h-[70px] shrink-0 min-w-0">
        <div className={`flex items-center gap-3 overflow-hidden ${!isOpen ? 'w-0 opacity-0' : 'flex-1'} transition-all duration-300`}>
          <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center text-bg-primary shrink-0">
            <Scale size={17} />
          </div>
          <span className="text-[15px] font-semibold text-text-primary whitespace-nowrap tracking-tight">Gavin AI</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-text-tertiary hover:text-text-primary p-1 rounded transition-colors shrink-0"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={onNewChat}
          className={`flex items-center w-full bg-accent-primary hover:bg-accent-hover text-bg-primary rounded-lg font-medium transition-all h-9 text-[13px] ${isOpen ? 'px-3 gap-2.5' : 'justify-center'}`}
          title={!isOpen ? 'New Chat' : undefined}
        >
          <Plus size={16} className="shrink-0" />
          {isOpen && <span className="whitespace-nowrap">New Chat</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              title={!isOpen ? mod.name : undefined}
              className={`flex items-center rounded-lg transition-all duration-150 h-10 group whitespace-nowrap ${
                isOpen ? 'px-3 gap-3' : 'justify-center'
              } ${
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {isOpen && <span className="text-[13px]">{mod.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* Mobile: Recent Chats */}
      {isMobile && isOpen && sessions.length > 0 && (
        <div className="border-t border-border px-3 py-3 flex flex-col gap-1 shrink-0 max-h-[240px] overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-2 mb-1 flex items-center gap-1.5">
            <Clock size={10} /> Recent chats
          </p>
          {[...sessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8).map(s => (
            <button key={s.id}
              onClick={() => { onSelectSession?.(s.id); setActiveModule('chat'); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                s.id === activeSessionId
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}>
              <p className="text-[12px] font-medium truncate">{s.title || 'Untitled'}</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">{timeAgo(s.updatedAt)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="px-2 py-2 border-t border-border flex flex-col gap-0.5 shrink-0">
        <button
          onClick={toggleTheme}
          title={!isOpen ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          className={`flex items-center rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all h-10 ${isOpen ? 'px-3 gap-3' : 'justify-center'}`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          {isOpen && <span className="text-[13px]">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={() => setShowSignOutConfirm(true)}
          title={!isOpen ? 'Sign Out' : undefined}
          className={`flex items-center rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-error transition-all h-10 ${isOpen ? 'px-3 gap-3' : 'justify-center'}`}
        >
          <LogOut size={17} />
          {isOpen && <span className="text-[13px]">Sign Out</span>}
        </button>
      </div>

      {/* User Profile */}
      <div className="px-2 pb-3 pt-2 border-t border-border shrink-0">
        <button
          onClick={onOpenProfile}
          title={!isOpen ? user?.email : undefined}
          className={`flex items-center w-full rounded-lg h-11 hover:bg-bg-tertiary transition-all ${isOpen ? 'px-2 gap-3' : 'justify-center'}`}
        >
          <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-bg-primary text-xs font-bold shrink-0">
            {userInitials}
          </div>
          {isOpen && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-[13px] font-medium text-text-primary truncate leading-tight">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[10px] text-text-tertiary truncate">{user?.email}</span>
            </div>
          )}
        </button>
      </div>
    </aside>

    {showSignOutConfirm && (
      <ConfirmModal
        title="Sign out?"
        message="You will be signed out of your account."
        confirmLabel="Sign Out"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    )}
    </>
  );
};

export default Sidebar;

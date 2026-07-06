import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MainChat from './components/MainChat';
import HistoryPanel from './components/HistoryPanel';
import StudyNotes from './components/StudyNotes';
import Flashcards from './components/Flashcards';
import Quizzes from './components/Quizzes';
import StudyPlanner from './components/StudyPlanner';
import StudyAnalytics from './components/StudyAnalytics';
import UserProfile from './components/UserProfile';
import AuthPage from './components/AuthPage';
import AuthGate from './components/AuthGate';
import { ThemeProvider } from './components/ThemeContext';
import { fetchSessions, upsertSession, deleteSession, renameSession } from './lib/sessions';
import { migrateAnonData } from './lib/auth';
import { fetchProfile } from './lib/profile';
import { fetchActivePlan } from './lib/planner';
import { supabase } from './lib/supabase';
import API_URL from './lib/api';
import './index.css';

const FREE_MSG_LIMIT = 3;

// Ping Render services on app load to wake them from sleep
const warmUpServices = () => {
  fetch(`${API_URL}/api/health`).catch(() => {});
  fetch('https://gavin-ai.onrender.com/docs').catch(() => {});
};

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(
    () => parseInt(localStorage.getItem('gavin-free-msgs') || '0')
  );

  const [activeModule, setActiveModule] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState('');

  const handleAskGavin = (question) => {
    setPrefillMessage(question);
    setActiveModule('chat');
  };

  const modules = {
    notes:      <StudyNotes />,
    flashcards: <Flashcards onAskGavin={handleAskGavin} />,
    quizzes:    <Quizzes profile={profile} activePlan={activePlan} />,
    analytics:  <StudyAnalytics activePlan={activePlan} />,
    planner:    <StudyPlanner onPlanChange={(plan) => setActivePlan(plan ? { ...plan, subjects: (plan.subjects || []).map(s => { if (typeof s !== 'string') return s.title || String(s); try { const p = JSON.parse(s); return (typeof p === 'object' && p.title) ? p.title : s; } catch { return s; } }) } : null)} onAskGavin={handleAskGavin} setActiveModule={setActiveModule} />,
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeSessionSummary, setActiveSessionSummary] = useState(null);
  const activeSessionTitleRef = useRef(null);

  // Wake up Render services immediately on app load
  useEffect(() => { warmUpServices(); }, []);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        migrateAnonData(currentUser.id).then(() => {
          fetchSessions(currentUser.id).then(setSessions);
          fetchProfile(currentUser.id).then(setProfile);
          fetchActivePlan().then(setActivePlan);
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      if (newUser) {
        await migrateAnonData(newUser.id);
        fetchSessions(newUser.id).then(setSessions);
        fetchProfile(newUser.id).then(setProfile);
        fetchActivePlan().then(setActivePlan);
        setShowAuthGate(false);
      } else {
        setSessions([]);
        setProfile(null);
        setActivePlan(null);
        setMessages([]);
        setActiveSessionId(null);
        setActiveSessionSummary(null);
        activeSessionTitleRef.current = null;
      }
      setUser(newUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleMessageSent = () => {
    if (user) return;
    const next = freeMessagesUsed + 1;
    setFreeMessagesUsed(next);
    localStorage.setItem('gavin-free-msgs', String(next));
    if (next >= FREE_MSG_LIMIT) setShowAuthGate(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);


  // Auto-save the active conversation as messages change (debounced)
  useEffect(() => {
    if (messages.length === 0) return;

    const sessionId = activeSessionId || crypto.randomUUID();
    const firstUserMsg = messages.find(m => m.role === 'user');
    const firstAiMsg = messages.find(m => m.role === 'assistant');

    const session = {
      id: sessionId,
      title: activeSessionTitleRef.current || (firstUserMsg ? firstUserMsg.content.slice(0, 60) : 'New conversation'),
      preview: firstAiMsg ? firstAiMsg.content.slice(0, 100) : '',
      messages,
      summary: activeSessionSummary,
      updatedAt: Date.now(),
    };

    // Update local state immediately (optimistic)
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === sessionId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = session;
        return next;
      }
      return [session, ...prev];
    });

    if (!activeSessionId) {
      setActiveSessionId(sessionId);
    }

    // Debounce the network write so we don't hit Supabase on every keystroke
    const timer = setTimeout(() => {
      upsertSession(session);
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, activeSessionId, activeSessionSummary]);

  const handleNewChat = () => {
    setActiveModule('chat');
    setActiveSessionId(null);
    setMessages([]);
    setActiveSessionSummary(null);
    activeSessionTitleRef.current = null;
  };

  const handleSelectSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setActiveModule('chat');
    setActiveSessionId(sessionId);
    setMessages(session.messages || []);
    setActiveSessionSummary(session.summary || null);
    activeSessionTitleRef.current = session.title || null;
  };

  const handleDeleteSession = (sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
      setActiveSessionSummary(null);
      activeSessionTitleRef.current = null;
    }
    deleteSession(sessionId);
  };

  const handleRenameSession = (sessionId, title) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s
    ));
    renameSession(sessionId, title);
  };

  if (authLoading) {
    return (
      <ThemeProvider>
        <div className="h-screen w-screen flex items-center justify-center bg-bg-primary">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-accent-primary rounded-xl flex items-center justify-center text-white animate-pulse">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-text-tertiary text-[13px]">Loading…</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <AuthPage onAuth={handleAuthSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen w-full overflow-hidden bg-bg-primary text-text-primary">

        {/* Mobile sidebar backdrop */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeModule={activeModule}
          setActiveModule={(mod) => {
            setActiveModule(mod);
            if (isMobile) setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          onNewChat={() => {
            handleNewChat();
            if (isMobile) setIsSidebarOpen(false);
          }}
          isMobile={isMobile}
          user={user}
          onOpenProfile={() => setActiveModule('profile')}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
        />

        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {/* Mobile top bar — shown for all modules except chat (chat owns its own header) */}
          {isMobile && activeModule !== 'chat' && (
            <div className="h-[52px] border-b border-border flex items-center gap-3 px-4 bg-bg-primary shrink-0">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span className="text-[14px] font-semibold text-text-primary">Gavin AI</span>
            </div>
          )}

          {activeModule === 'chat'
            ? <MainChat messages={messages} setMessages={setMessages} onMessageSent={handleMessageSent} profile={profile} activePlan={activePlan} prefillMessage={prefillMessage} onPrefillConsumed={() => setPrefillMessage('')} conversationSummary={activeSessionSummary} onSummaryUpdate={setActiveSessionSummary} sessionId={activeSessionId} isMobile={isMobile} onOpenSidebar={() => setIsSidebarOpen(true)} onTitleGenerated={(title, sessionId) => {
                activeSessionTitleRef.current = title;
                const id = sessionId || activeSessionId;
                if (id) {
                  setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
                  renameSession(id, title);
                }
              }} />
            : activeModule === 'profile'
            ? <UserProfile user={user} profile={profile} onProfileSaved={setProfile} />
            : <div className="flex-1 min-h-0 flex flex-col">{modules[activeModule]}</div>
          }

          {showAuthGate && !user && <AuthGate onAuth={handleAuthSuccess} />}
        </main>

        {activeModule === 'chat' && !isMobile && (
          <HistoryPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;

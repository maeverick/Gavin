import API_URL from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  Plus, Layers, Trash2, ChevronLeft, ChevronRight, X, Loader2,
  RotateCcw, Sparkles, Check, RefreshCw, Trophy, Calendar,
  Pencil, Zap, Clock, Share2, Copy, CheckCheck, Download, Link,
  BookOpen, FileText, CheckSquare, CalendarDays, ChevronRight as Arrow,
  Scale, Search,
} from 'lucide-react';
import { fetchDecks, saveDeck, updateDeck, deleteDeck, shareDeck, unshareDeck, fetchSharedDeck, importDeck } from '../lib/decks';
import { fetchNotes } from '../lib/notes';
import { fetchQuizzes } from '../lib/quizzes';
import { fetchActivePlan } from '../lib/planner';

// ─── NEW: Spaced Repetition ───────────────────────────────────────────────────

const RATINGS = [
  { value: 0, label: 'Again',  sub: '< 1 min',  icon: X,         style: 'bg-error/10 border-error/30 text-error hover:bg-error/20' },
  { value: 1, label: 'Hard',   sub: '1 day',    icon: RefreshCw, style: 'bg-warning/10 border-warning/30 text-warning hover:bg-warning/20' },
  { value: 3, label: 'Medium', sub: '3 days',   icon: Clock,     style: 'bg-blue-400/10 border-blue-400/30 text-blue-400 hover:bg-blue-400/20' },
  { value: 5, label: 'Easy',   sub: '7 days',   icon: Check,     style: 'bg-accent-secondary/10 border-accent-secondary/30 text-accent-secondary hover:bg-accent-secondary/20' },
];

const calcNextReview = (card, rating) => {
  let intervalDays;
  if (!card.review_count) {
    intervalDays = rating === 0 ? 0 : rating === 1 ? 1 : rating === 3 ? 3 : 7;
  } else {
    const cur = card.last_interval_days || 1;
    intervalDays = rating === 0 ? 1 : rating === 1 ? cur * 1.2 : rating === 3 ? cur * 2 : cur * 2.5;
  }
  intervalDays = Math.min(Math.round(intervalDays), 180);
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  return { intervalDays, nextReviewDate: next.toISOString().split('T')[0] };
};

const isDue = (card) => !card.next_review_date || new Date(card.next_review_date) <= new Date();
const getDueCount = (deck) => (deck.cards || []).filter(isDue).length;

// ─── Share Modal ─────────────────────────────────────────────────────────────

const ShareModal = ({ deck, onClose, onShared }) => {
  const [shareId, setShareId]     = useState(deck.is_public ? deck.share_id : null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const shareLink = shareId ? `${window.location.origin}${window.location.pathname}?import=${shareId}` : null;
  const shareCode = shareId ? shareId.slice(0, 8).toUpperCase() : null;

  const handleShare = async () => {
    setIsLoading(true);
    const id = await shareDeck(deck.id);
    if (id) { setShareId(id); onShared(deck.id, id); }
    setIsLoading(false);
  };

  const handleUnshare = async () => {
    await unshareDeck(deck.id);
    setShareId(null);
    onShared(deck.id, null);
  };

  const copy = async (text, setCopied) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">Share Deck</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="bg-bg-primary border border-border rounded-xl p-4">
            <p className="text-[13px] font-semibold text-text-primary mb-1">{deck.title}</p>
            <p className="text-[11px] text-text-tertiary">{deck.cards?.length || 0} cards</p>
          </div>

          {!shareId ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Make this deck public so other students can import it using a link or code.
              </p>
              <button onClick={handleShare} disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {isLoading ? 'Generating link…' : 'Share this deck'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[12px] text-accent-secondary font-medium flex items-center gap-1.5">
                <Check size={13} /> Deck is public — anyone with the link or code can import it
              </p>

              {/* Share link */}
              <div>
                <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                  <Link size={10} /> Share Link
                </label>
                <div className="flex gap-2">
                  <input readOnly value={shareLink}
                    className="flex-1 bg-bg-primary border border-border rounded-xl px-3 py-2 text-[11px] text-text-secondary outline-none truncate" />
                  <button onClick={() => copy(shareLink, setCopiedLink)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all shrink-0 ${copiedLink ? 'border-accent-secondary text-accent-secondary bg-accent-secondary/10' : 'border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary'}`}>
                    {copiedLink ? <CheckCheck size={13} /> : <Copy size={13} />}
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share code */}
              <div>
                <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mb-2 block">
                  Share Code
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-center">
                    <span className="text-[20px] font-bold text-text-primary tracking-[0.2em]">{shareCode}</span>
                  </div>
                  <button onClick={() => copy(shareCode, setCopiedCode)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all shrink-0 ${copiedCode ? 'border-accent-secondary text-accent-secondary bg-accent-secondary/10' : 'border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary'}`}>
                    {copiedCode ? <CheckCheck size={13} /> : <Copy size={13} />}
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1.5">Students can enter this code in "Import Deck"</p>
              </div>

              <button onClick={handleUnshare}
                className="text-[12px] text-error hover:underline text-left">
                Stop sharing this deck
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Import Modal ─────────────────────────────────────────────────────────────

const ImportModal = ({ onClose, onImported, initialShareId }) => {
  const [input, setInput]         = useState(initialShareId || '');
  const [preview, setPreview]     = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError]         = useState('');

  const extractShareId = (val) => {
    const trimmed = val.trim();
    // URL param
    try {
      const url = new URL(trimmed);
      const id = url.searchParams.get('import');
      if (id) return id;
    } catch {}
    // Raw share_id or code (8-char uppercase)
    if (trimmed.length === 8) return trimmed.toLowerCase();
    // Full UUID
    if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;
    return trimmed;
  };

  const handleLookup = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setError('');
    setPreview(null);
    const shareId = extractShareId(input);
    const deck = await fetchSharedDeck(shareId);
    if (!deck) {
      setError('Deck not found. Check the link or code and try again.');
    } else {
      setPreview(deck);
    }
    setIsLoading(false);
  };

  const handleImport = async () => {
    if (!preview) return;
    setIsImporting(true);
    const imported = await importDeck(preview);
    setIsImporting(false);
    if (imported) onImported(imported);
    else setError('Import failed. Please try again.');
  };

  useEffect(() => {
    if (initialShareId) handleLookup();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Download size={15} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">Import Deck</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <form onSubmit={handleLookup} className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Share link or code</label>
              <input type="text" value={input} onChange={e => setInput(e.target.value)} autoFocus
                placeholder="Paste link or enter 8-character code (e.g. A1B2C3D4)"
                className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50" />
            </div>
            <button type="submit" disabled={!input.trim() || isLoading}
              className="flex items-center justify-center gap-2 border border-border bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary px-4 py-2 rounded-xl text-[13px] transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : null}
              {isLoading ? 'Looking up…' : 'Look up deck'}
            </button>
          </form>

          {error && <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

          {preview && (
            <div className="flex flex-col gap-3">
              <div className="bg-bg-primary border border-accent-primary/30 rounded-xl p-4">
                <p className="text-[13px] font-semibold text-text-primary mb-1">{preview.title}</p>
                {preview.description && <p className="text-[12px] text-text-secondary mb-2">{preview.description}</p>}
                <div className="flex gap-3 text-[11px] text-text-tertiary">
                  <span>{preview.cards?.length || 0} cards</span>
                  {preview.topic && <span>· {preview.topic}</span>}
                </div>
              </div>
              <button onClick={handleImport} disabled={isImporting}
                className="flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all">
                {isImporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {isImporting ? 'Importing…' : 'Import to my decks'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Source Picker Modal ─────────────────────────────────────────────────────

const SOURCES = [
  {
    id: 'ai',
    icon: Sparkles,
    label: 'AI by Topic',
    description: 'Generate cards on any Nigerian law topic using Gavin AI',
    color: 'text-accent-primary',
    bg: 'bg-accent-primary/10',
    available: true,
  },
  {
    id: 'notes',
    icon: BookOpen,
    label: 'From Study Notes',
    description: 'Generate cards from your uploaded lecture notes and documents',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    available: true,
  },
  {
    id: 'quiz',
    icon: CheckSquare,
    label: 'From Quiz Mistakes',
    description: 'Turn questions you got wrong into targeted study cards',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    available: true,
  },
  {
    id: 'plan',
    icon: CalendarDays,
    label: 'From Study Plan',
    description: "Generate cards for this week's study plan topics",
    color: 'text-accent-secondary',
    bg: 'bg-accent-secondary/10',
    available: true,
  },
  {
    id: 'library',
    icon: Scale,
    label: 'Nigerian Law Library',
    description: 'Search indexed cases & statutes and generate cards from real legal content',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    available: true,
  },
  {
    id: 'manual',
    icon: Pencil,
    label: 'Create Manually',
    description: 'Write your own question and answer cards from scratch',
    color: 'text-text-secondary',
    bg: 'bg-bg-tertiary',
    available: true,
  },
];

// ─── Library Search Modal ─────────────────────────────────────────────────────

const LibrarySearchModal = ({ onClose, onGenerated }) => {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]         = useState('');
  const [cardCount, setCardCount] = useState(8);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;
    setIsSearching(true);
    setError('');
    setSelected(new Set());
    try {
      const res = await fetch(`${API_URL}/api/library/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), k: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      if ((data.results || []).length === 0) setError('No results found. Try different keywords.');
    } catch (err) {
      setError(err.message || 'Search failed. Make sure the AI service is running.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleResult = (idx) => setSelected(prev => {
    const n = new Set(prev);
    n.has(idx) ? n.delete(idx) : n.add(idx);
    return n;
  });

  const selectAll = () => setSelected(new Set(results.map((_, i) => i)));
  const clearAll  = () => setSelected(new Set());

  const handleGenerate = async () => {
    if (!selected.size || isGenerating) return;
    setIsGenerating(true);
    setError('');
    const sourceText = [...selected].map(i => results[i].content).join('\n\n---\n\n');
    const sourceName = [...selected].map(i => results[i].source).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    try {
      const res = await fetch(`${API_URL}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query.trim(), count: cardCount, source_text: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const cards = (data.cards || []).map((c, i) => ({
        id: `card-${i}-${Date.now()}`,
        front: c.front, back: c.back,
        mastered: false, review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null,
      }));
      const saved = await saveDeck({
        title: data.title || `Library: ${query.trim()}`,
        description: `Generated from ${sourceName}`,
        topic: query.trim(), cards,
      });
      if (saved) onGenerated(saved);
      else setError('Failed to save deck.');
    } catch (err) {
      setError(err.message || 'Failed to generate. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanSource = (src) => src.replace(/^.*[/\\]/, '').replace(/\.(pdf|txt)$/i, '').replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-green-400" />
            <h3 className="text-[14px] font-semibold text-text-primary">Nigerian Law Library</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. actus reus, locus standi, offer and acceptance…"
                className="w-full bg-bg-primary border border-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50"
              />
            </div>
            <button onClick={handleSearch} disabled={!query.trim() || isSearching}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all shrink-0">
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary mt-2">Searches the indexed Nigerian legal corpus — cases, statutes, and principles.</p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-text-tertiary">{results.length} passages found — select what to generate from</span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[11px] text-accent-primary hover:text-accent-hover">Select all</button>
                <span className="text-text-tertiary">·</span>
                <button onClick={clearAll} className="text-[11px] text-text-secondary hover:text-text-primary">Clear</button>
              </div>
            </div>
          )}
          <div className="p-3 flex flex-col gap-2">
            {results.map((result, idx) => {
              const sel = selected.has(idx);
              return (
                <button key={idx} onClick={() => toggleResult(idx)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                    sel ? 'border-green-400/40 bg-green-400/5' : 'border-border hover:bg-bg-tertiary'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      sel ? 'border-green-400 bg-green-400' : 'border-border'
                    }`}>
                      {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-green-400 mb-1 truncate">{cleanSource(result.source)}</p>
                      <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-3">{result.content}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[12px] text-error bg-error/10 mx-4 mb-2 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-4 border-t border-border flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-secondary whitespace-nowrap">Cards:</span>
              <select value={cardCount} onChange={e => setCardCount(Number(e.target.value))}
                className="bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-[12px] text-text-primary outline-none">
                {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={onClose} className="px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
            <button onClick={handleGenerate} disabled={!selected.size || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-all">
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {isGenerating ? 'Generating…' : `Generate from ${selected.size} passage${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SourcePickerModal = ({ onClose, onSelect }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-accent-primary" />
          <h3 className="text-[14px] font-semibold text-text-primary">Create New Deck</h3>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
      </div>

      <div className="p-3 flex flex-col gap-1">
        {SOURCES.map(({ id, icon: Icon, label, description, color, bg, available }) => (
          <button key={id}
            onClick={() => available && onSelect(id)}
            disabled={!available}
            className={`flex items-center gap-4 w-full px-4 py-4 rounded-xl text-left transition-all ${
              available
                ? 'hover:bg-bg-tertiary cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-text-primary">{label}</p>
                {!available && (
                  <span className="text-[9px] font-bold uppercase tracking-wide bg-bg-tertiary text-text-tertiary px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{description}</p>
            </div>
            {available && <ChevronRight size={14} className="text-text-tertiary shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Quiz Mistakes Modal ──────────────────────────────────────────────────────

const isCorrect = (opt, correct) => opt === correct || opt?.charAt(0) === correct;

const QuizMistakesModal = ({ onClose, onGenerated }) => {
  const [quizzes, setQuizzes]     = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { fetchQuizzes().then(d => { setQuizzes(d); setIsLoading(false); }); }, []);

  const mistakeCount = (quiz) => {
    const attempts = quiz.attempts || [];
    if (!attempts.length) return 0;
    const latest = attempts[attempts.length - 1];
    return (quiz.questions || []).filter((q, i) => {
      const ans = latest.answers?.[i];
      return ans && !isCorrect(ans, q.correct_answer);
    }).length;
  };

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    const cards = [];
    quizzes.filter(q => selected.has(q.id)).forEach(quiz => {
      const attempts = quiz.attempts || [];
      if (!attempts.length) return;
      const latest = attempts[attempts.length - 1];
      (quiz.questions || []).forEach((q, i) => {
        const ans = latest.answers?.[i];
        if (!ans || isCorrect(ans, q.correct_answer)) return;
        cards.push({
          id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          front: q.question,
          back: `Correct answer: **${q.correct_answer}**\n\n${q.explanation || ''}`,
          subject: q.subject || quiz.topic,
          mastered: false, review_count: 0,
          last_interval_days: 1, next_review_date: null, last_rated: null,
        });
      });
    });

    if (cards.length === 0) {
      setError('No mistakes found in the selected quizzes. Take some quizzes first!');
      setIsGenerating(false);
      return;
    }

    const saved = await saveDeck({
      title: `Quiz Mistakes — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      description: `${cards.length} cards from questions you got wrong`,
      topic: 'Quiz Mistakes', cards,
    });
    if (saved) onGenerated(saved);
    else setError('Failed to save deck. Please try again.');
    setIsGenerating(false);
  };

  const quizzesWithMistakes = quizzes.filter(q => mistakeCount(q) > 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-orange-400" />
            <h3 className="text-[14px] font-semibold text-text-primary">From Quiz Mistakes</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-text-tertiary" /></div>
          ) : quizzesWithMistakes.length === 0 ? (
            <div className="text-center py-12 px-6">
              <CheckSquare size={28} className="text-text-tertiary mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary mb-1">No mistakes found</p>
              <p className="text-[12px] text-text-tertiary">Complete some quizzes first. Cards will be generated from questions you got wrong.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {quizzesWithMistakes.map(quiz => {
                const count = mistakeCount(quiz);
                const sel = selected.has(quiz.id);
                return (
                  <button key={quiz.id} onClick={() => toggle(quiz.id)}
                    className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left transition-all border ${sel ? 'border-orange-400/40 bg-orange-400/5' : 'border-transparent hover:bg-bg-tertiary'}`}>
                    <div className="w-9 h-9 rounded-xl bg-orange-400/10 flex items-center justify-center shrink-0">
                      <CheckSquare size={15} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{quiz.title}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{count} mistake{count !== 1 ? 's' : ''} → {count} card{count !== 1 ? 's' : ''}</p>
                    </div>
                    {sel && <Check size={14} className="text-orange-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-[12px] text-error bg-error/10 mx-4 mb-2 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

        <div className="p-4 border-t border-border flex gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
          <button onClick={handleGenerate} disabled={selected.size === 0 || isGenerating}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-400 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-all">
            {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <CheckSquare size={13} />}
            {isGenerating ? 'Creating deck…' : `Create deck from ${[...selected].reduce((s, id) => s + mistakeCount(quizzes.find(q => q.id === id) || {}), 0)} mistakes`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Study Plan Modal ─────────────────────────────────────────────────────────

const StudyPlanModal = ({ onClose, onGenerated }) => {
  const [plan, setPlan]           = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress]   = useState('');
  const [error, setError]         = useState('');

  useEffect(() => { fetchActivePlan().then(p => { setPlan(p); setIsLoading(false); }); }, []);

  const getCurrentWeek = () => {
    if (!plan) return null;
    const weeks = plan.plan?.weeks || [];
    const total = plan.plan?.total_weeks || weeks.length;
    const num = Math.min(Math.floor((Date.now() - new Date(plan.created_at)) / (7 * 86400000)) + 1, total);
    return weeks.find(w => w.week === num) || weeks[0];
  };

  const week = getCurrentWeek();

  const allTasks = week
    ? week.days.flatMap(day => (day.tasks || []).map((task, idx) => ({ key: `${day.day}-${idx}`, day: day.day, task })))
    : [];

  const toggle = (key) => setSelected(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  const handleGenerate = async () => {
    if (!selected.size) return;
    setIsGenerating(true);
    setError('');
    const tasks = allTasks.filter(t => selected.has(t.key));
    const allCards = [];
    let generatedTitle = '';

    try {
      for (const { task } of tasks) {
        const topic = `${task.subject}: ${task.topic}`;
        setProgress(`Generating cards for ${task.subject}…`);
        const res = await fetch(`${API_URL}/api/flashcards/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, count: 10 }),
        });
        const data = await res.json();
        if (res.ok && data.cards) {
          if (!generatedTitle) generatedTitle = data.title || '';
          data.cards.forEach(c => allCards.push({
            id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            front: c.front, back: c.back, subject: task.subject,
            mastered: false, review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null,
          }));
        }
      }

      if (!allCards.length) { setError('Failed to generate cards. Make sure the AI service is running.'); setIsGenerating(false); return; }

      const deckTitle = tasks.length === 1
        ? (generatedTitle || tasks[0].task.subject)
        : `${tasks[0].task.subject} — ${tasks.length} Topics`;

      const saved = await saveDeck({
        title: deckTitle,
        description: `${allCards.length} cards from study plan · Week ${week?.week}`,
        topic: tasks.map(({ task }) => task.topic).join(', '), cards: allCards,
      });
      if (saved) onGenerated(saved);
      else setError('Failed to save deck.');
    } catch {
      setError('Failed to generate. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-accent-secondary" />
            <h3 className="text-[14px] font-semibold text-text-primary">From Study Plan</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-text-tertiary" /></div>
          ) : !plan ? (
            <div className="text-center py-12 px-6">
              <CalendarDays size={28} className="text-text-tertiary mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary mb-1">No study plan found</p>
              <p className="text-[12px] text-text-tertiary">Create a study plan in the Study Planner module first.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-text-tertiary px-3 pb-2">
                Week {week?.week} · {week?.theme || plan.exam_type} · Select topics to generate cards from
              </p>
              {allTasks.map(({ key, day, task }) => {
                const sel = selected.has(key);
                return (
                  <button key={key} onClick={() => toggle(key)}
                    className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left transition-all border ${sel ? 'border-accent-secondary/40 bg-accent-secondary/5' : 'border-transparent hover:bg-bg-tertiary'}`}>
                    <div className="w-9 h-9 rounded-xl bg-accent-secondary/10 flex items-center justify-center shrink-0">
                      <CalendarDays size={14} className="text-accent-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate">{task.subject}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{day} · {task.topic}</p>
                    </div>
                    {sel && <Check size={14} className="text-accent-secondary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {progress && <p className="text-[12px] text-accent-secondary px-4 pb-2 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> {progress}</p>}
        {error && <p className="text-[12px] text-error bg-error/10 mx-4 mb-2 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

        <div className="p-4 border-t border-border flex gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
          <button onClick={handleGenerate} disabled={selected.size === 0 || isGenerating || !plan}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-secondary hover:bg-accent-secondary/80 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-all">
            {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {isGenerating ? 'Generating…' : `Generate from ${selected.size} topic${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Note Picker Modal ────────────────────────────────────────────────────────

const NotePickerModal = ({ onClose, onSelect }) => {
  const [notes, setNotes]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchNotes().then(data => { setNotes(data); setIsLoading(false); });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">Select a Note</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-text-tertiary" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 px-6">
              <BookOpen size={28} className="text-text-tertiary mx-auto mb-3" />
              <p className="text-[13px] font-medium text-text-primary mb-1">No notes yet</p>
              <p className="text-[12px] text-text-tertiary">Upload a document in Study Notes first, then come back to generate flashcards from it.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notes.map(note => (
                <button key={note.id}
                  onClick={() => setSelected(note.id)}
                  className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left transition-all border ${
                    selected === note.id
                      ? 'border-accent-primary bg-accent-primary/5'
                      : 'border-transparent hover:bg-bg-tertiary'
                  }`}>
                  <div className="w-9 h-9 rounded-xl bg-accent-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{note.title}</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">
                      {note.filename} · {(note.tags || []).slice(0, 2).join(', ')}
                    </p>
                  </div>
                  {selected === note.id && <Check size={14} className="text-accent-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
          <button onClick={() => selected && onSelect(notes.find(n => n.id === selected))}
            disabled={!selected}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-all">
            <Sparkles size={13} /> Generate from this note
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Generate Modal (unchanged) ───────────────────────────────────────────────

const GenerateModal = ({ onClose, onGenerated, notesOnly = false, prefillNote = null }) => {
  const [topic, setTopic] = useState(prefillNote?.title || '');
  const [count, setCount] = useState(10);
  const [sourceNoteId, setSourceNoteId] = useState(prefillNote?.id || '');
  const [notes, setNotes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchNotes().then(setNotes); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if ((!topic.trim() && !notesOnly) || isGenerating) return;
    setIsGenerating(true);
    setError('');
    let sourceText = null;
    if (sourceNoteId) {
      const note = notes.find(n => n.id === sourceNoteId);
      if (note) sourceText = JSON.stringify(note.summary);
    }
    try {
      const res = await fetch(`${API_URL}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), count, source_text: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      // NEW: add SRS fields to each card
      const cards = (data.cards || []).map((c, i) => ({
        id: `card-${i}-${Date.now()}`,
        front: c.front,
        back: c.back,
        mastered: false,
        review_count: 0,
        last_interval_days: 1,
        next_review_date: null,
        last_rated: null,
      }));

      const saved = await saveDeck({
        title: data.title || topic.trim(),
        description: data.description || '',
        topic: topic.trim(),
        cards,
      });
      if (saved) onGenerated(saved);
    } catch (err) {
      setError(err.message || 'Failed to generate flashcards. Make sure the AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">{notesOnly ? 'Generate from Study Notes' : 'Generate New Deck'}</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={16} /></button>
        </div>
        <form onSubmit={handleGenerate} className="p-5 flex flex-col gap-4">
          {!notesOnly && (
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Topic</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Section 36 of the 1999 Constitution" autoFocus
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40" />
            </div>
          )}
          {notes.length > 0 && (
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Source note (optional)</label>
              <select value={sourceNoteId} onChange={e => setSourceNoteId(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent-primary/40">
                <option value="">No source — generate from general knowledge</option>
                {notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Number of cards: {count}</label>
            <input type="range" min="3" max="25" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full accent-accent-primary" />
            <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>3</span><span>25</span></div>
          </div>
          {error && <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={(!topic.trim() && !notesOnly) || isGenerating}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-all">
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── NEW: Create Card Modal ───────────────────────────────────────────────────

const CreateCardModal = ({ onClose, onCreated }) => {
  const [front, setFront] = useState('');
  const [back, setBack]   = useState('');
  const [subject, setSubject] = useState('');
  const [deckTitle, setDeckTitle] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    const card = { id: `card-0-${Date.now()}`, front: front.trim(), back: back.trim(), subject, mastered: false, review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null };
    const saved = await saveDeck({ title: deckTitle.trim() || subject || 'My Cards', description: '', topic: subject, cards: [card] });
    if (saved) onCreated(saved);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Pencil size={15} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">Create Card Manually</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Deck title</label>
              <input type="text" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="My Flashcards"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Criminal Law"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Front (Question)</label>
            <textarea value={front} onChange={e => setFront(e.target.value)} rows={3} autoFocus
              placeholder="What is the difference between murder and manslaughter?"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40 resize-none" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Back (Answer)</label>
            <textarea value={back} onChange={e => setBack(e.target.value)} rows={4}
              placeholder="Murder requires malice aforethought, while manslaughter is unlawful killing without malice…"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40 resize-none" />
            <p className="text-[10px] text-text-tertiary mt-1">Tip: Keep the front simple, the back detailed.</p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
            <button type="submit" disabled={!front.trim() || !back.trim()}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-all">
              <Pencil size={13} /> Create Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Study Mode (old design + SRS ratings + breakdown) ───────────────────────

const StudyMode = ({ deck, onExit, onUpdate, onAskGavin }) => {
  const [idx, setIdx]           = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewed, setReviewed] = useState({});   // { cardId: rating value }
  const [isComplete, setIsComplete] = useState(false);
  const [startTime]             = useState(Date.now());
  const [elapsed, setElapsed]   = useState(0);

  useEffect(() => {
    if (isComplete) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isComplete, startTime]);

  const cards = deck.cards || [];
  const card  = cards[idx];

  // NEW: SRS-aware mark handler
  const handleMark = (rating) => {
    if (!card) return;

    const { intervalDays, nextReviewDate } = calcNextReview(card, rating);
    const updatedCard = {
      ...card,
      mastered: rating === 5,
      review_count: (card.review_count || 0) + 1,
      last_interval_days: intervalDays,
      next_review_date: nextReviewDate,
      last_rated: rating,
    };

    setReviewed(prev => ({ ...prev, [card.id]: rating }));

    if (idx + 1 >= cards.length) {
      setIsComplete(true);
      const updatedCards = cards.map(c => c.id === card.id ? updatedCard : c);
      onUpdate(deck.id, { cards: updatedCards });
    } else {
      const updatedCards = cards.map(c => c.id === card.id ? updatedCard : c);
      onUpdate(deck.id, { cards: updatedCards });
      setIdx(idx + 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => { setIdx(0); setIsFlipped(false); setReviewed({}); setIsComplete(false); };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-text-secondary mb-4">This deck has no cards.</p>
        <button onClick={onExit} className="text-accent-primary text-[13px]">Back to library</button>
      </div>
    );
  }

  if (isComplete) {
    const ratings  = Object.values(reviewed);
    const total    = ratings.length;
    const gotIt    = ratings.filter(r => r === 5).length;
    const review   = total - gotIt;
    const pct      = total > 0 ? Math.round((gotIt / total) * 100) : 0;
    const mins     = Math.floor(elapsed / 60);
    const secs     = elapsed % 60;
    const timeStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Next review schedule
    const tomorrow  = Object.values(reviewed).filter(r => r === 1).length;
    const in3days   = Object.values(reviewed).filter(r => r === 3).length;
    const in7days   = Object.values(reviewed).filter(r => r === 5).length;

    return (
      <div className="flex flex-col h-full">
        <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
          <button onClick={onExit} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-[13px]">
            <ChevronLeft size={16} /> Back to decks
          </button>
        </header>
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-6">
            <Trophy size={36} />
          </div>
          <h2 className="font-display text-3xl text-text-primary mb-2">Deck complete!</h2>
          <p className="text-text-secondary text-[14px] mb-8">
            You reviewed all {cards.length} cards in <strong>{deck.title}</strong> in <strong>{timeStr}</strong>.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mb-8">
            <div>
              <p className="font-display text-4xl text-accent-secondary">{gotIt}</p>
              <p className="text-[12px] text-text-tertiary uppercase tracking-widest mt-1">Got it</p>
            </div>
            <div>
              <p className="font-display text-4xl text-warning">{review}</p>
              <p className="text-[12px] text-text-tertiary uppercase tracking-widest mt-1">To review</p>
            </div>
            <div>
              <p className="font-display text-4xl text-text-primary">{pct}%</p>
              <p className="text-[12px] text-text-tertiary uppercase tracking-widest mt-1">Score</p>
            </div>
          </div>

          {/* Next review schedule */}
          {total > 0 && (
            <div className="w-full max-w-sm bg-bg-secondary border border-border rounded-2xl p-5 mb-8 text-left">
              <p className="text-[11px] uppercase tracking-widest text-text-tertiary mb-4">Next Review Schedule</p>
              {[
                { label: 'Tomorrow', count: tomorrow },
                { label: 'In 3 days', count: in3days },
                { label: 'In 7 days', count: in7days },
              ].filter(r => r.count > 0).map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-[13px] text-text-secondary">{r.label}</span>
                  <span className="text-[13px] font-semibold text-text-primary">{r.count} {r.count === 1 ? 'card' : 'cards'}</span>
                </div>
              ))}
              <p className="text-[11px] text-text-tertiary mt-3">Cards you marked "Review again" will show up tomorrow.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleRestart}
              className="flex items-center gap-2 border border-border bg-bg-secondary px-5 py-2.5 rounded-xl text-[13px] text-text-secondary hover:text-text-primary hover:border-accent-primary transition-all">
              <RotateCcw size={14} /> Study again
            </button>
            <button onClick={onExit}
              className="bg-accent-primary hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all">
              Back to library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-[60px] border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3">
        <button onClick={onExit} className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-[13px] shrink-0">
          <ChevronLeft size={16} /> Exit
        </button>
        <div className="flex flex-col items-center min-w-0 flex-1">
          <p className="text-[12px] sm:text-[13px] font-semibold text-text-primary truncate max-w-full text-center">{deck.title}</p>
          <p className="text-[10px] sm:text-[11px] text-text-tertiary">{idx + 1} of {cards.length}</p>
        </div>
        <div className="flex items-center gap-1 bg-bg-secondary border border-border px-2.5 py-1.5 rounded-lg shrink-0">
          <Clock size={11} className="text-text-tertiary" />
          <span className="text-[11px] sm:text-[12px] font-mono text-text-secondary">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>
      </header>

      {/* Progress bar — unchanged */}
      <div className="h-1 bg-bg-secondary">
        <div className="h-full bg-accent-primary transition-all duration-300"
          style={{ width: `${((idx + (isFlipped ? 0.5 : 0)) / cards.length) * 100}%` }} />
      </div>

      {/* Card — unchanged 3D flip */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full max-w-2xl h-[280px] sm:h-[350px] md:h-[400px] cursor-pointer [perspective:1500px]">
          <div className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 [backface-visibility:hidden] bg-bg-secondary border border-border rounded-3xl flex flex-col items-center justify-center p-6 sm:p-10 text-center shadow-xl overflow-auto">
              <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-4">Question</p>
              <p className="text-text-primary text-[15px] sm:text-[18px] md:text-[20px] leading-relaxed font-display">{card.front}</p>
              <p className="text-[11px] text-text-tertiary mt-6">Click card to flip</p>
            </div>
            {/* Back */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-accent-primary text-white rounded-3xl flex flex-col items-center justify-center p-6 sm:p-10 text-center shadow-xl shadow-accent-primary/20 overflow-auto">
              <p className="text-[10px] uppercase tracking-widest text-white/70 mb-4">Answer</p>
              <p className="text-[13px] sm:text-[15px] md:text-[16px] leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>

        {/* Action buttons — original 2-button style, SRS runs underneath */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {isFlipped ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <button onClick={() => handleMark(1)}
                  className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning px-5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-warning/20 transition-all">
                  <RefreshCw size={14} /> Review again
                </button>
                <button onClick={() => handleMark(5)}
                  className="flex items-center gap-2 bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary px-5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-accent-secondary/20 transition-all">
                  <Check size={14} /> Got it
                </button>
              </div>
              {onAskGavin && (
                <button
                  onClick={() => onAskGavin(`Explain this in more detail: ${card.front}`)}
                  className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-accent-primary transition-colors"
                >
                  <Sparkles size={12} /> Ask Gavin to explain this
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setIsFlipped(true)}
              className="bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all shadow-md shadow-accent-primary/20">
              Show answer
            </button>
          )}

          {/* Nav arrows — unchanged */}
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => { if (idx > 0) { setIdx(idx - 1); setIsFlipped(false); } }} disabled={idx === 0}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-[12px] text-text-tertiary tabular-nums">{idx + 1} / {cards.length}</span>
            <button onClick={() => { if (idx + 1 < cards.length) { setIdx(idx + 1); setIsFlipped(false); } }} disabled={idx + 1 >= cards.length}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Deck Card (reference card design) ───────────────────────────────────────

const DECK_COLORS = [
  '#7C3AED', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4',
];

const getDeckColor = (title) => DECK_COLORS[title.charCodeAt(0) % DECK_COLORS.length];

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const DeckCard = ({ deck, onStudy, onDelete, onShare }) => {
  const cardCount     = deck.cards?.length || 0;
  const masteredCount = (deck.cards || []).filter(c => c.mastered).length;
  const dueCount      = getDueCount(deck);
  const pct           = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0;
  const color         = getDeckColor(deck.title);
  const initials      = deck.title.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Infer subject tags from topic/title
  const tags = [];
  const text = (deck.topic || deck.title || '').toLowerCase();
  if (text.includes('constitution') || text.includes('fundamental')) tags.push('Constitutional');
  if (text.includes('criminal') || text.includes('crime')) tags.push('Criminal');
  if (text.includes('contract') || text.includes('offer')) tags.push('Contract');
  if (text.includes('tort') || text.includes('negligence')) tags.push('Tort');
  if (text.includes('company') || text.includes('cama')) tags.push('Company');
  if (text.includes('land') || text.includes('property')) tags.push('Land');
  if (text.includes('evidence')) tags.push('Evidence');
  if (tags.length === 0) tags.push('Nigerian Law');
  if (cardCount > 0) tags.push(`${cardCount} cards`);

  return (
    <div onClick={onStudy}
      className="bg-bg-secondary border border-border rounded-2xl p-5 sm:p-7 cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-between relative min-h-[380px] sm:min-h-[450px]"
      style={{ width: '100%', maxWidth: '400px' }}>

      {/* Hover actions — top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={e => { e.stopPropagation(); onShare(deck); }}
          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${deck.is_public ? 'border-accent-secondary/40 text-accent-secondary bg-accent-secondary/10' : 'border-border text-text-tertiary hover:text-accent-primary hover:border-accent-primary/40'}`}>
          <Share2 size={10} /> {deck.is_public ? 'Shared' : 'Share'}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(deck.id); }}
          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-text-tertiary hover:text-error hover:border-error/40 transition-all">
          <Trash2 size={10} /> Delete
        </button>
      </div>

      {/* Top section */}
      <div className="flex flex-col gap-5 pr-16">
        {/* Date */}
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest">{timeAgo(deck.created_at)}</p>

        {/* Title */}
        <h3 className="font-display text-[26px] font-bold text-text-primary leading-snug">
          {deck.title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[13px] text-text-secondary bg-bg-tertiary px-4 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
          {dueCount > 0 && (
            <span className="text-[13px] font-semibold text-text-primary bg-bg-tertiary px-4 py-1.5 rounded-full flex items-center gap-1.5">
              <Zap size={11} /> {dueCount} Due
            </span>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[16px] font-bold text-text-primary">{pct}% Mastered</p>
            <p className="text-[12px] text-text-tertiary mt-1">{masteredCount}/{cardCount} Cards</p>
          </div>
          <button className="bg-accent-primary text-bg-primary px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-80">
            Study Now
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Empty Library (old design + create option) ───────────────────────────────

const EmptyLibrary = ({ onGenerate, onCreate }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 text-center">
    <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
      <Layers size={28} />
    </div>
    <h2 className="font-display text-2xl text-text-primary mb-3">No decks yet</h2>
    <p className="text-text-secondary text-[14px] max-w-sm mb-7 leading-relaxed">
      Generate AI-powered flashcards on any Nigerian law topic, or create your own cards manually.
    </p>
    <div className="flex gap-3">
      <button onClick={onCreate}
        className="flex items-center gap-2 border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all">
        <Pencil size={14} /> Create Manually
      </button>
      <button onClick={onGenerate}
        className="bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-[14px] font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2">
        <Sparkles size={15} /> Generate First Deck
      </button>
    </div>
  </div>
);

// ─── Root ─────────────────────────────────────────────────────────────────────

const Flashcards = ({ onAskGavin }) => {
  const [decks, setDecks]           = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [modal, setModal]           = useState(null); // 'generate' | 'create' | 'import'
  const [sharingDeck, setSharingDeck] = useState(null);
  const [isLoading, setIsLoading]   = useState(true);

  // Check URL for ?import= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importId = params.get('import');
    if (importId) {
      setModal({ type: 'import', shareId: importId });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchDecks().then(data => { setDecks(data); setIsLoading(false); });
  }, []);

  const handleGenerated = (deck) => {
    setDecks(prev => [deck, ...prev]);
    setModal(null);
    setActiveDeck(deck);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (deckId) => {
    await deleteDeck(deckId);
    setDecks(prev => prev.filter(d => d.id !== deckId));
    setConfirmDeleteId(null);
  };

  const handleUpdateDeck = async (deckId, updates) => {
    await updateDeck(deckId, updates);
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, ...updates } : d));
  };

  const handleShared = (deckId, shareId) => {
    setDecks(prev => prev.map(d =>
      d.id === deckId ? { ...d, is_public: !!shareId, share_id: shareId || d.share_id } : d
    ));
  };

  const handleImported = (deck) => {
    setDecks(prev => [deck, ...prev]);
    setModal(null);
    setSharingDeck(null);
    setActiveDeck(deck);
  };

  const totalDue = decks.reduce((sum, d) => sum + getDueCount(d), 0);
  const decksDue = decks.filter(d => getDueCount(d) > 0).length;

  if (activeDeck) {
    const liveDeck = decks.find(d => d.id === activeDeck.id) || activeDeck;
    return <StudyMode deck={liveDeck} onExit={() => setActiveDeck(null)} onUpdate={handleUpdateDeck} onAskGavin={onAskGavin} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — old design, NEW Create button added */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Flashcards</h2>
            <p className="text-[10px] text-text-tertiary">
              {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
              {decksDue > 0 && ` · ${decksDue} ${decksDue === 1 ? 'deck' : 'decks'} due`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ type: 'import' })} title="Import deck"
            className="flex items-center gap-1.5 border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary px-2.5 sm:px-3 py-2 rounded-xl text-[13px] transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={() => setModal({ type: 'create' })} title="Create card"
            className="flex items-center gap-1.5 border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary px-2.5 sm:px-3 py-2 rounded-xl text-[13px] transition-all">
            <Pencil size={13} /> <span className="hidden sm:inline">Create</span>
          </button>
          <button onClick={() => setModal({ type: 'picker' })}
            className="flex items-center gap-1.5 sm:gap-2 bg-accent-primary hover:bg-accent-hover text-white px-3 sm:px-4 py-2 rounded-xl text-[13px] font-medium transition-all shadow-md shadow-accent-primary/20">
            <Plus size={14} /> <span className="hidden xs:inline">New</span><span className="hidden sm:inline"> Deck</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-text-tertiary" />
          </div>
        ) : decks.length === 0 ? (
          <EmptyLibrary onGenerate={() => setModal({ type: 'picker' })} onCreate={() => setModal({ type: 'picker' })} />
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* NEW: due today banner */}
            {totalDue > 0 && (
              <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary"><Zap size={15} /></div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{decksDue} {decksDue === 1 ? 'deck' : 'decks'} due for review</p>
                    <p className="text-[11px] text-text-tertiary">Review them to strengthen your memory</p>
                  </div>
                </div>
                <button onClick={() => { const first = decks.find(d => getDueCount(d) > 0); if (first) setActiveDeck(first); }}
                  className="bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-[12px] font-medium transition-all">
                  Start reviewing
                </button>
              </div>
            )}

            {/* Old grid layout */}
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-start">
              {decks.map(deck => (
                <DeckCard key={deck.id} deck={deck}
                  onStudy={() => setActiveDeck(deck)}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  onShare={(d) => setSharingDeck(d)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {modal?.type === 'picker'   && (
        <SourcePickerModal
          onClose={() => setModal(null)}
          onSelect={(id) => setModal({ type: id === 'ai' ? 'generate' : id === 'notes' ? 'note-picker' : id === 'quiz' ? 'quiz-mistakes' : id === 'plan' ? 'study-plan' : id === 'library' ? 'library' : id })}
        />
      )}
      {modal?.type === 'library'       && <LibrarySearchModal onClose={() => setModal(null)} onGenerated={handleGenerated} />}
      {modal?.type === 'quiz-mistakes' && <QuizMistakesModal onClose={() => setModal(null)} onGenerated={handleGenerated} />}
      {modal?.type === 'study-plan'    && <StudyPlanModal    onClose={() => setModal(null)} onGenerated={handleGenerated} />}
      {modal?.type === 'note-picker' && (
        <NotePickerModal
          onClose={() => setModal(null)}
          onSelect={(note) => setModal({ type: 'generate', prefillNote: note })}
        />
      )}
      {modal?.type === 'generate' && (
        <GenerateModal
          onClose={() => setModal(null)}
          onGenerated={handleGenerated}
          prefillNote={modal.prefillNote}
        />
      )}
      {modal?.type === 'create'  && <CreateCardModal onClose={() => setModal(null)} onCreated={handleGenerated} />}
      {modal?.type === 'manual'  && <CreateCardModal onClose={() => setModal(null)} onCreated={handleGenerated} />}
      {modal?.type === 'import'         && <ImportModal onClose={() => setModal(null)} onImported={handleImported} initialShareId={modal.shareId} />}
      {sharingDeck && <ShareModal deck={sharingDeck} onClose={() => setSharingDeck(null)} onShared={handleShared} />}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete deck?"
          message="This flashcard deck and all its cards will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

export default Flashcards;

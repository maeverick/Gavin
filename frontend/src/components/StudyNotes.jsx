import API_URL from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  Upload, FileText, Trash2, ChevronLeft, BookOpen, Scale, Layers,
  CheckSquare, Tag, Loader2, Pencil, Check, X, Search, Sparkles,
  Library,
} from 'lucide-react';
import { fetchNotes, saveNote, deleteNote, updateNoteTitle } from '../lib/notes';
import { saveDeck } from '../lib/decks';
import { saveQuiz } from '../lib/quizzes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TagBadge = ({ tag }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary text-[11px] font-medium">
    <Tag size={9} /> {tag}
  </span>
);


const noteTimeAgo = (dateStr) => {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
};

const INFER_TAGS = (summary) => {
  const text = JSON.stringify(summary).toLowerCase();
  const tags = [];
  if (text.includes('constitution') || text.includes('fundamental right')) tags.push('Constitutional Law');
  if (text.includes('contract') || text.includes('offer') || text.includes('consideration')) tags.push('Contract Law');
  if (text.includes('criminal') || text.includes('offence') || text.includes('mens rea')) tags.push('Criminal Law');
  if (text.includes('evidence') || text.includes('admissib')) tags.push('Evidence');
  if (text.includes('land') || text.includes('property') || text.includes('land use act')) tags.push('Property Law');
  if (text.includes('company') || text.includes('cama') || text.includes('incorporation')) tags.push('Company Law');
  if (text.includes('tort') || text.includes('negligence') || text.includes('liability')) tags.push('Tort Law');
  return tags.slice(0, 3);
};

const cleanSource = (src) => src.replace(/^.*[/\\]/, '').replace(/\.(pdf|txt)$/i, '').replace(/_/g, ' ');

const NoteCard = ({ note, onClick, onDelete }) => {
  const keyCount  = note.summary?.keyPoints?.length || 0;
  const caseCount = note.summary?.cases?.length || 0;
  const tags = note.tags || [];

  return (
    <div onClick={onClick}
      className="bg-bg-secondary border border-border rounded-2xl p-5 sm:p-7 cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-between relative min-h-[380px] sm:min-h-[450px]"
      style={{ width: '100%', maxWidth: '400px' }}>

      {/* Hover actions — top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-text-tertiary hover:text-error hover:border-error/40 transition-all">
          <Trash2 size={10} /> Delete
        </button>
      </div>

      {/* Top section */}
      <div className="flex flex-col gap-5 pr-16">
        {/* Date */}
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest">{noteTimeAgo(note.created_at)}</p>

        {/* Title */}
        <h3 className="font-display text-[26px] font-bold text-text-primary leading-snug">
          {note.title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[13px] text-text-secondary bg-bg-tertiary px-4 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-[13px] text-text-secondary bg-bg-tertiary px-4 py-1.5 rounded-full">
              {note.filename?.split('.').pop()?.toUpperCase() || 'DOC'}
            </span>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[16px] font-bold text-text-primary">{keyCount} Key Points</p>
            <p className="text-[12px] text-text-tertiary mt-1">{caseCount} case{caseCount !== 1 ? 's' : ''} referenced</p>
          </div>
          <button className="bg-accent-primary text-bg-primary px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-80">
            View Notes
          </button>
        </div>
      </div>
    </div>
  );
};


// ─── Note Detail ──────────────────────────────────────────────────────────────
const NoteDetail = ({ note, onBack, onDelete, onRename }) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle]     = useState(note.title);
  const [actionStatus, setActionStatus] = useState(null);
  const titleInputRef = useRef(null);

  useEffect(() => { if (editingTitle) titleInputRef.current?.focus(); }, [editingTitle]);

  const commitTitle = () => {
    const next = draftTitle.trim();
    if (next && next !== note.title) onRename(note.id, next);
    setEditingTitle(false);
  };

  const handleGenerateFlashcards = async () => {
    setActionStatus('generating-flashcards');
    try {
      const s = note.summary || {};
      const parts = [];
      if (s.overview)            parts.push(s.overview);
      if (s.keyPoints?.length)   parts.push('Key Points:\n' + s.keyPoints.map(p => `- ${p}`).join('\n'));
      if (s.cases?.length)       parts.push('Cases:\n' + s.cases.join(', '));
      if (s.statutes?.length)    parts.push('Statutes:\n' + s.statutes.join('\n'));
      if (s.definitions?.length) parts.push('Definitions:\n' + s.definitions.map(d => `${d.term}: ${d.definition}`).join('\n'));
      const sourceText = parts.join('\n\n');

      const res = await fetch(`${API_URL}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: note.title, count: 10, source_text: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cards = (data.cards || []).map((c, i) => ({
        id: `card-${i}-${Date.now()}`, front: c.front, back: c.back,
        mastered: false, review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null,
      }));
      await saveDeck({ title: data.title || note.title, description: `From: ${note.filename}`, topic: note.title, cards });
      setActionStatus('flashcards-done');
    } catch { setActionStatus('error'); }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleGenerateQuiz = async () => {
    setActionStatus('generating-quiz');
    try {
      const s = note.summary || {};
      const parts = [];
      if (s.overview)            parts.push(s.overview);
      if (s.keyPoints?.length)   parts.push('Key Points:\n' + s.keyPoints.map(p => `- ${p}`).join('\n'));
      if (s.cases?.length)       parts.push('Cases:\n' + s.cases.join(', '));
      if (s.statutes?.length)    parts.push('Statutes:\n' + s.statutes.join('\n'));
      const sourceText = parts.join('\n\n');

      const res = await fetch(`${API_URL}/api/quizzes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: note.title, count: 10, quiz_type: 'topic', difficulty: 'mixed', source_text: sourceText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await saveQuiz({ title: data.title || note.title, topic: note.title, quiz_type: 'topic', mode: 'practice', duration_minutes: 0, questions: data.questions, attempts: [] });
      setActionStatus('quiz-done');
    } catch { setActionStatus('error'); }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const s = note.summary || {};

  return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-[13px] transition-colors">
            <ChevronLeft size={16} /> Study Center
          </button>
          <span className="text-text-tertiary">/</span>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input ref={titleInputRef} value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                onBlur={commitTitle} onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="bg-bg-secondary border border-accent-primary/40 rounded-lg px-2 py-1 text-[14px] text-text-primary outline-none" />
              <button onClick={commitTitle} className="text-accent-primary"><Check size={14} /></button>
              <button onClick={() => setEditingTitle(false)} className="text-text-tertiary"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => { setDraftTitle(note.title); setEditingTitle(true); }}
              className="flex items-center gap-2 text-[14px] font-medium text-text-primary hover:text-accent-primary transition-colors group">
              {note.title}
              <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary flex items-center gap-1"><FileText size={11} /> {note.filename}</span>
          <button onClick={() => onDelete(note.id)}
            className="flex items-center gap-1.5 text-text-tertiary hover:text-error text-[12px] transition-colors px-2 py-1 rounded-lg hover:bg-bg-secondary ml-2">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {(note.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">{note.tags.map(tag => <TagBadge key={tag} tag={tag} />)}</div>
          )}
          {s.overview && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3">Overview</h3>
              <p className="text-text-primary text-[14.5px] leading-relaxed">{s.overview}</p>
            </section>
          )}
          {s.keyPoints?.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3">Key Points</h3>
              <ul className="flex flex-col gap-2.5">
                {s.keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-3 text-[14px] text-text-primary leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {s.cases?.length > 0 && (
              <section className="bg-bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-1.5"><Scale size={12} /> Cases Referenced</h3>
                <ul className="flex flex-col gap-2">
                  {s.cases.map((c, i) => <li key={i} className="text-[13px] text-text-primary border-b border-border last:border-0 pb-2 last:pb-0">{c}</li>)}
                </ul>
              </section>
            )}
            {s.statutes?.length > 0 && (
              <section className="bg-bg-secondary border border-border rounded-2xl p-5">
                <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-1.5"><BookOpen size={12} /> Statutes Referenced</h3>
                <ul className="flex flex-col gap-2">
                  {s.statutes.map((st, i) => <li key={i} className="text-[13px] text-text-primary border-b border-border last:border-0 pb-2 last:pb-0">{st}</li>)}
                </ul>
              </section>
            )}
          </div>
          {s.definitions?.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3">Definitions</h3>
              <div className="flex flex-col gap-3">
                {s.definitions.map((d, i) => (
                  <div key={i} className="bg-bg-secondary border border-border rounded-xl p-4">
                    <p className="text-[13px] font-semibold text-accent-primary mb-1">{d.term}</p>
                    <p className="text-[13px] text-text-secondary leading-relaxed">{d.definition}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Actions — now functional */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleGenerateFlashcards}
                disabled={actionStatus?.includes('generating')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary text-[13px] text-text-secondary hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 transition-all">
                {actionStatus === 'generating-flashcards' ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                {actionStatus === 'flashcards-done' ? 'Deck saved!' : 'Generate Flashcards'}
              </button>
              <button onClick={handleGenerateQuiz}
                disabled={actionStatus?.includes('generating')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary text-[13px] text-text-secondary hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 transition-all">
                {actionStatus === 'generating-quiz' ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                {actionStatus === 'quiz-done' ? 'Quiz saved!' : 'Generate Quiz'}
              </button>
            </div>
            {actionStatus === 'error' && <p className="text-[12px] text-error mt-2">Failed — make sure the AI service is running.</p>}
          </section>
        </div>
      </div>
    </div>
  );
};

// ─── Law Library Tab ──────────────────────────────────────────────────────────
const INDEXED_DOCS = [
  { name: 'Constitution of Nigeria 1999',             subject: 'Constitutional Law' },
  { name: 'Criminal Code Act',                        subject: 'Criminal Law' },
  { name: 'Administration of Criminal Justice Act 2015', subject: 'Criminal Procedure' },
  { name: 'Evidence Act 2011',                        subject: 'Evidence' },
  { name: 'Companies and Allied Matters Act 2020',    subject: 'Company Law' },
  { name: 'Land Use Act 1978',                        subject: 'Land Law' },
  { name: 'Rules of Professional Conduct 2007',       subject: 'Professional Ethics' },
  { name: 'Penal Code (Northern States)',             subject: 'Criminal Law' },
  { name: 'Investments & Securities Act 2007',        subject: 'Company Law' },
  { name: 'Matrimonial Causes Act',                   subject: 'Family Law' },
];

const LawLibrary = () => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionStatus, setActionStatus] = useState({}); // { idx: status }
  const [error, setError]           = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;
    setIsSearching(true);
    setError('');
    setResults([]);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_URL}/api/library/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), k: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
      if (!data.results?.length) setError('No results found. Try different keywords.');
    } catch (err) {
      setError(err.message || 'Search failed. Make sure the AI service is running.');
    } finally {
      setIsSearching(false);
    }
  };

  const setStatus = (idx, status) => setActionStatus(prev => ({ ...prev, [idx]: status }));

  const handleSaveFlashcards = async (result, idx) => {
    setStatus(idx, 'flashcards');
    try {
      const res = await fetch(`${API_URL}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query, count: 8, source_text: result.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cards = (data.cards || []).map((c, i) => ({
        id: `card-${i}-${Date.now()}`, front: c.front, back: c.back,
        mastered: false, review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null,
      }));
      await saveDeck({ title: data.title || `Library: ${query}`, description: `From ${cleanSource(result.source)}`, topic: query, cards });
      setStatus(idx, 'flashcards-done');
    } catch { setStatus(idx, null); }
  };

  const handleSaveQuiz = async (result, idx) => {
    setStatus(idx, 'quiz');
    try {
      const res = await fetch(`${API_URL}/api/quizzes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query, count: 8, quiz_type: 'topic', difficulty: 'mixed', source_text: result.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await saveQuiz({ title: data.title || `Library: ${query}`, topic: query, quiz_type: 'topic', mode: 'practice', duration_minutes: 0, questions: data.questions, attempts: [] });
      setStatus(idx, 'quiz-done');
    } catch { setStatus(idx, null); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input ref={inputRef} type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search Nigerian legal corpus — cases, statutes, principles…"
              className="w-full bg-bg-primary border border-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50"
            />
          </div>
          <button onClick={handleSearch} disabled={!query.trim() || isSearching}
            className="flex items-center gap-1.5 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all shrink-0">
            {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Search
          </button>
        </div>

        {error && <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-text-tertiary">{results.length} passages found for "{query}"</p>
            {results.map((result, idx) => (
              <div key={idx} className="bg-bg-secondary border border-border rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-[10px] font-semibold text-accent-primary uppercase tracking-wide">{cleanSource(result.source)}</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{result.content}</p>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <button onClick={() => handleSaveFlashcards(result, idx)}
                    disabled={!!actionStatus[idx]}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-accent-primary hover:border-accent-primary/40 disabled:opacity-60 transition-all">
                    {actionStatus[idx] === 'flashcards' ? <Loader2 size={11} className="animate-spin" /> : <Layers size={11} />}
                    {actionStatus[idx] === 'flashcards-done' ? 'Deck saved!' : 'Flashcards'}
                  </button>
                  <button onClick={() => handleSaveQuiz(result, idx)}
                    disabled={!!actionStatus[idx]}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-accent-primary hover:border-accent-primary/40 disabled:opacity-60 transition-all">
                    {actionStatus[idx] === 'quiz' ? <Loader2 size={11} className="animate-spin" /> : <CheckSquare size={11} />}
                    {actionStatus[idx] === 'quiz-done' ? 'Quiz saved!' : 'Generate Quiz'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Indexed documents — shown before first search */}
        {!hasSearched && (
          <div>
            <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-3">Indexed documents</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INDEXED_DOCS.map(doc => (
                <button key={doc.name} onClick={() => { setQuery(doc.name); }}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-left hover:border-accent-primary/40 transition-all group">
                  <Scale size={14} className="text-text-tertiary group-hover:text-accent-primary shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-text-primary group-hover:text-accent-primary">{doc.name}</p>
                    <p className="text-[10px] text-text-tertiary">{doc.subject}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyDocuments = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 text-center">
    <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
      <BookOpen size={28} />
    </div>
    <h2 className="font-display text-2xl text-text-primary mb-3">No documents yet</h2>
    <p className="text-text-secondary text-[14px] max-w-sm mb-7 leading-relaxed">
      Upload a PDF or text file — lecture notes, textbook chapters, statutes — and Gavin will summarise and extract the key legal concepts for you.
    </p>
    <button onClick={onUpload}
      className="bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-[14px] font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2">
      <Upload size={15} /> Upload Document
    </button>
  </div>
);

// ─── Root ─────────────────────────────────────────────────────────────────────
const StudyNotes = () => {
  const [tab, setTab]               = useState('documents');
  const [notes, setNotes]           = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchNotes().then(data => { setNotes(data); setIsLoading(false); }); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsProcessing(true);
    setProcessingFile(file.name);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const res = await fetch(`${API_URL}/api/notes/summarize`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarise');
      const tags  = INFER_TAGS(data);
      const saved = await saveNote({ title: data.title || file.name.replace(/\.[^/.]+$/, ''), filename: file.name, summary: data, tags });
      if (saved) { setNotes(prev => [saved, ...prev]); setActiveNote(saved); }
    } catch { alert(`Failed to process "${file.name}". Make sure the AI service is running.`); }
    finally { setIsProcessing(false); setProcessingFile(''); }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (noteId) => {
    await deleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNote?.id === noteId) setActiveNote(null);
    setConfirmDeleteId(null);
  };

  const handleRename = async (noteId, title) => {
    await updateNoteTitle(noteId, title);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title } : n));
    if (activeNote?.id === noteId) setActiveNote(prev => ({ ...prev, title }));
  };

  const confirmModal = confirmDeleteId ? (
    <ConfirmModal
      title="Delete note?"
      message="This note and its summary will be permanently deleted."
      confirmLabel="Delete"
      onConfirm={() => handleDelete(confirmDeleteId)}
      onCancel={() => setConfirmDeleteId(null)}
    />
  ) : null;

  if (activeNote) {
    return (
      <>
        <NoteDetail
          note={activeNote}
          onBack={() => setActiveNote(null)}
          onDelete={(id) => setConfirmDeleteId(id)}
          onRename={handleRename}
        />
        {confirmModal}
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Library size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Study Center</h2>
            <p className="text-[10px] text-text-tertiary">
              {tab === 'documents'
                ? `${notes.length} ${notes.length === 1 ? 'document' : 'documents'}`
                : 'Nigerian legal corpus'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex bg-bg-secondary border border-border rounded-xl p-0.5">
            <button onClick={() => setTab('documents')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${tab === 'documents' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <BookOpen size={13} /> <span className="hidden sm:inline">My Documents</span><span className="sm:hidden">Docs</span>
            </button>
            <button onClick={() => setTab('library')}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${tab === 'library' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <Scale size={13} /> <span className="hidden sm:inline">Law Library</span><span className="sm:hidden">Library</span>
            </button>
          </div>

          {tab === 'documents' && (
            <>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                className="flex items-center gap-1.5 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-xl text-[13px] font-medium transition-all shadow-md shadow-accent-primary/20">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                <span className="hidden sm:inline">{isProcessing ? 'Processing…' : 'Upload'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Processing banner */}
      {isProcessing && (
        <div className="mx-6 mt-4 px-4 py-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl flex items-center gap-3 text-[13px] text-accent-primary">
          <Loader2 size={15} className="animate-spin shrink-0" />
          Gavin is reading and summarising <strong>{processingFile}</strong>…
        </div>
      )}

      {/* Tab content */}
      {tab === 'library' ? (
        <LawLibrary />
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-text-tertiary" /></div>
      ) : notes.length === 0 ? (
        <EmptyDocuments onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-start">
              {notes.map(note => (
                <NoteCard key={note.id} note={note} onClick={() => setActiveNote(note)} onDelete={(id) => setConfirmDeleteId(id)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {confirmModal}
  </>
  );
};

export default StudyNotes;

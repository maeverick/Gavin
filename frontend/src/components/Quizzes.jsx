import API_URL from '../lib/api';
import { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  CheckSquare, Plus, Trash2, Sparkles, Loader2, X, Trophy,
  ChevronLeft, Clock, RotateCcw, BookOpen, Calendar, Flag,
  Scale, FileText, AlertCircle, Layers, Check,
  Share2, Copy, CheckCheck,
} from 'lucide-react';
import { fetchQuizzes, saveQuiz, saveAttempt, deleteQuiz, shareQuiz, unshareQuiz } from '../lib/quizzes';
import { fetchNotes } from '../lib/notes';
import { saveDeck } from '../lib/decks';

const ALL_SUBJECTS = [
  'Constitutional Law', 'Criminal Law and Procedure', 'Civil Procedure',
  'Law of Contract', 'Law of Torts', 'Equity and Trusts',
  'Company Law and Partnership', 'Land Law', 'Professional Ethics', 'Evidence',
];

const DIFFICULTY_COLORS = {
  easy:   'text-green-400 bg-green-400/10',
  medium: 'text-orange-400 bg-orange-400/10',
  hard:   'text-red-400 bg-red-400/10',
};

const TYPE_CONFIG = {
  case_based_mcq: { icon: Scale,    label: 'Case-Based',  color: 'text-purple-400 bg-purple-400/10' },
  statute_mcq:    { icon: FileText, label: 'Statute',     color: 'text-blue-400 bg-blue-400/10' },
  mcq:            { icon: CheckSquare, label: 'MCQ',      color: 'text-accent-primary bg-accent-primary/10' },
};

// ─── Difficulty from academic level ───────────────────────────────────────────
const getDiagnosticDifficulty = (level) => {
  if (!level) return 'mixed';
  const l = level.toLowerCase();
  if (l.includes('100l')) return 'easy';
  if (l.includes('200l') || l.includes('300l')) return 'easy';
  if (l.includes('400l') || l.includes('500l')) return 'medium';
  if (l.includes('bar') || l.includes('law school')) return 'hard';
  return 'mixed';
};

const DIFFICULTY_LABELS = { easy: 'Foundation', medium: 'Intermediate', hard: 'Bar Level', mixed: 'Mixed' };
const DURATION_OPTIONS = [
  { label: 'No limit', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '90 min', value: 90 },
];

// ─── Generate Modal ────────────────────────────────────────────────────────────
const GenerateModal = ({ onClose, onGenerated, profile, activePlan }) => {
  const DEFAULT_COUNT = { topic: 10, subject: 20, mixed: 25, diagnostic: 30 };
  const MAX_COUNT     = { topic: 30, subject: 30, mixed: 30, diagnostic: 30 };
  const MIN_COUNT     = { topic: 1,  subject: 1,  mixed: 1,  diagnostic: 1  };

  const [quizType, setQuizType]         = useState('topic');
  const [topic, setTopic]               = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [count, setCount]               = useState(10);
  const [countInput, setCountInput]     = useState('10');
  const [mode, setMode]                 = useState('practice');
  const [duration, setDuration]         = useState(0);
  const [sourceNoteId, setSourceNoteId] = useState('');
  const [notes, setNotes]               = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => { fetchNotes().then(setNotes); }, []);

  const SUBJECT_LIST = (activePlan?.subjects?.length > 0) ? activePlan.subjects : ALL_SUBJECTS;
  const diagnosticDifficulty = getDiagnosticDifficulty(profile?.academic_level);

  const toggleSubject = (s) =>
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleCountChange = (val) => {
    setCountInput(val);
    const n = parseInt(val);
    if (!isNaN(n) && n >= MIN_COUNT[quizType] && n <= MAX_COUNT[quizType]) setCount(n);
  };

  const handleTypeChange = (val) => {
    setQuizType(val);
    setSelectedSubjects([]);
    const def = DEFAULT_COUNT[val];
    setCount(def);
    setCountInput(String(def));
    if (val === 'diagnostic') setMode('exam');
  };

  const isReady = quizType === 'topic'
    ? topic.trim().length > 0
    : quizType === 'mixed' || quizType === 'diagnostic'
      ? true
      : selectedSubjects.length > 0;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!isReady || isGenerating) return;
    setIsGenerating(true);
    setError('');

    const topicStr = quizType === 'topic'
      ? topic.trim()
      : selectedSubjects.length > 0
        ? selectedSubjects.join(', ')
        : ALL_SUBJECTS.join(', ');

    const difficulty = quizType === 'diagnostic' ? diagnosticDifficulty : 'mixed';

    let sourceText = null;
    if (sourceNoteId) {
      const note = notes.find(n => n.id === sourceNoteId);
      if (note?.summary) {
        const s = note.summary;
        const parts = [];
        if (s.overview)            parts.push(s.overview);
        if (s.keyPoints?.length)   parts.push('Key Points:\n' + s.keyPoints.map(p => `- ${p}`).join('\n'));
        if (s.cases?.length)       parts.push('Cases:\n' + s.cases.join(', '));
        if (s.statutes?.length)    parts.push('Statutes:\n' + s.statutes.join('\n'));
        if (s.definitions?.length) parts.push('Definitions:\n' + s.definitions.map(d => `${d.term}: ${d.definition}`).join('\n'));
        sourceText = parts.join('\n\n');
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/quizzes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicStr,
          subject: quizType === 'subject' ? selectedSubjects[0] : '',
          quiz_type: quizType === 'diagnostic' ? 'mixed' : quizType,
          count,
          difficulty,
          source_text: sourceText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (!data.questions?.length) throw new Error('AI returned no questions. Try again.');

      const saved = await saveQuiz({
        title: data.title || topicStr,
        topic: topicStr,
        quiz_type: quizType,
        mode,
        duration_minutes: duration,
        questions: data.questions,
        attempts: [],
      });
      if (saved) onGenerated(saved);
      else throw new Error('Quiz was generated but could not be saved.');
    } catch (err) {
      setError(err.message || 'Failed to generate quiz. Make sure the AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-primary" />
            <div>
              <h3 className="text-[14px] font-semibold text-text-primary">Generate New Quiz</h3>
              {(profile?.academic_level || profile?.target_exam) && (
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  {[profile.academic_level, profile.target_exam].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={16} /></button>
        </div>

        <form onSubmit={handleGenerate} className="p-5 flex flex-col gap-4 overflow-y-auto">

          {/* Active plan banner */}
          {activePlan && (
            <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Calendar size={12} className="text-accent-primary shrink-0" />
              <p className="text-[11px] text-accent-primary">
                Using subjects from your active <strong>{activePlan.exam_type}</strong> plan
              </p>
            </div>
          )}

          {/* Quiz type — 2×2 grid */}
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Quiz type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'topic',      label: 'By Topic',   sub: 'Focus on one specific topic' },
                { val: 'subject',    label: 'By Subject', sub: 'One full subject area' },
                { val: 'mixed',      label: 'Mixed',      sub: 'Multiple subjects at once' },
                { val: 'diagnostic', label: 'Diagnostic', sub: 'Assess your knowledge level' },
              ].map(({ val, label, sub }) => (
                <button key={val} type="button" onClick={() => handleTypeChange(val)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                    quizType === val
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border bg-bg-primary hover:border-accent-primary/40'
                  }`}>
                  <p className={`text-[12px] font-semibold ${quizType === val ? 'text-accent-primary' : 'text-text-primary'}`}>{label}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic info banner */}
          {quizType === 'diagnostic' && (
            <div className="bg-purple-400/5 border border-purple-400/20 rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-purple-400 font-semibold mb-0.5">
                Difficulty: {DIFFICULTY_LABELS[diagnosticDifficulty]}
                {profile?.academic_level ? ` (based on ${profile.academic_level})` : ''}
              </p>
              <p className="text-[11px] text-text-tertiary">Select subjects to be tested on. Questions will match your academic level.</p>
            </div>
          )}

          {/* Topic input — only for "By Topic" */}
          {quizType === 'topic' && (
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Topic</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} autoFocus
                placeholder="e.g. Elements of a valid contract under Nigerian law"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40" />
            </div>
          )}

          {/* Subject picker — for subject, mixed, diagnostic */}
          {quizType === 'subject' && (
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Subject</label>
              <select value={selectedSubjects[0] || ''} onChange={e => setSelectedSubjects([e.target.value])}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent-primary/40">
                <option value="">Select a subject</option>
                {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {(quizType === 'mixed' || quizType === 'diagnostic') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-text-secondary">
                  Subjects {selectedSubjects.length > 0 ? `(${selectedSubjects.length} selected)` : '(all if none selected)'}
                </label>
                <button type="button" onClick={() => setSelectedSubjects(selectedSubjects.length === SUBJECT_LIST.length ? [] : [...SUBJECT_LIST])}
                  className="text-[11px] text-accent-primary hover:text-accent-hover">
                  {selectedSubjects.length === SUBJECT_LIST.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto bg-bg-primary border border-border rounded-lg p-2">
                {SUBJECT_LIST.map(s => (
                  <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-secondary cursor-pointer">
                    <input type="checkbox" checked={selectedSubjects.includes(s)} onChange={() => toggleSubject(s)} className="accent-accent-primary" />
                    <span className="text-[12px] text-text-primary">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Mode — diagnostic forces exam mode */}
          {quizType !== 'diagnostic' && (
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Mode</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('practice')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all ${mode === 'practice' ? 'border-accent-secondary bg-accent-secondary/10 text-accent-secondary' : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'}`}>
                  Practice — instant feedback
                </button>
                <button type="button" onClick={() => setMode('exam')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all ${mode === 'exam' ? 'border-orange-400 bg-orange-400/10 text-orange-400' : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'}`}>
                  Exam — submit all
                </button>
              </div>
            </div>
          )}

          {/* Number of questions — type or +/- */}
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Number of questions</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { const n = Math.max(MIN_COUNT[quizType], count - 1); setCount(n); setCountInput(String(n)); }}
                className="w-9 h-9 rounded-lg border border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent-primary/40 text-[18px] flex items-center justify-center transition-all shrink-0">
                −
              </button>
              <input
                type="number"
                value={countInput}
                onChange={e => handleCountChange(e.target.value)}
                onBlur={() => { const n = Math.max(MIN_COUNT[quizType], Math.min(MAX_COUNT[quizType], count || MIN_COUNT[quizType])); setCount(n); setCountInput(String(n)); }}
                min={MIN_COUNT[quizType]}
                max={MAX_COUNT[quizType]}
                className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-[16px] font-semibold text-text-primary text-center outline-none focus:border-accent-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button type="button" onClick={() => { const n = Math.min(MAX_COUNT[quizType], count + 1); setCount(n); setCountInput(String(n)); }}
                className="w-9 h-9 rounded-lg border border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent-primary/40 text-[18px] flex items-center justify-center transition-all shrink-0">
                +
              </button>
            </div>
            <p className="text-[10px] text-text-tertiary mt-1">Min {MIN_COUNT[quizType]} · Max {MAX_COUNT[quizType]}</p>
          </div>

          {/* Duration */}
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Time limit</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(({ label, value }) => (
                <button key={value} type="button" onClick={() => setDuration(value)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    duration === value
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Source note */}
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">
              Generate from <span className="text-accent-primary">uploaded document</span> (optional)
            </label>
            {notes.length > 0 ? (
              <select value={sourceNoteId} onChange={e => setSourceNoteId(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent-primary/40">
                <option value="">No — use general knowledge</option>
                {notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-lg px-3 py-2.5">
                <BookOpen size={13} className="text-text-tertiary shrink-0" />
                <p className="text-[12px] text-text-tertiary">No uploaded notes yet — upload a document in <strong>Study Notes</strong> first.</p>
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
            <button type="submit" disabled={!isReady || isGenerating}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[13px] font-medium">
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const isCorrectAnswer = (opt, correct) => opt === correct || opt.charAt(0) === correct;
const getOptionText = (opt) => opt.replace(/^[A-D][.):\s]\s*/i, '');
const getOptionLetter = (opt) => opt.charAt(0).toUpperCase();

// ─── Quiz Session ──────────────────────────────────────────────────────────────
const QuizSession = ({ quiz, onExit, onComplete, title }) => {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(new Set());
  const [flagged, setFlagged] = useState(new Set());
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [savedCards, setSavedCards] = useState(new Set());
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const questions = quiz.questions || [];
  const q = questions[idx];
  const mode = quiz.mode || 'practice';
  const durationSecs = (quiz.duration_minutes || 0) * 60;
  const isLast = idx + 1 >= questions.length;
  const selected = answers[idx] || null;
  const isChecked = checked.has(idx);
  const pct = Math.round((Object.keys(answers).length / questions.length) * 100);

  useEffect(() => {
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(secs);
      // Auto-submit when countdown hits zero
      if (durationSecs > 0 && secs >= durationSecs) {
        clearInterval(timer);
        finishQuiz();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, durationSecs]);

  const handleAddToFlashcards = async (question) => {
    const card = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      front: question.question,
      back: `Correct answer: **${question.correct_answer}**\n\n${question.explanation || ''}`,
      subject: question.subject || quiz.topic,
      mastered: false, review_count: 0,
      last_interval_days: 1, next_review_date: null, last_rated: null,
    };
    await saveDeck({
      title: `Quiz: ${question.subject || quiz.title}`,
      description: 'Saved from quiz mistake',
      topic: question.topic || quiz.topic,
      cards: [card],
    });
    setSavedCards(prev => new Set(prev).add(idx));
  };

  const navigate = (newIdx) => {
    setIdx(newIdx);
  };

  const handleSelect = (opt) => {
    setAnswers(prev => ({ ...prev, [idx]: opt }));
    // In practice mode, uncheck if they change answer
    if (checked.has(idx)) setChecked(prev => { const n = new Set(prev); n.delete(idx); return n; });
  };

  const handleCheck = () => {
    if (!selected) return;
    setChecked(prev => new Set(prev).add(idx));
  };

  const handleNext = () => {
    if (isLast) {
      finishQuiz();
    } else {
      navigate(idx + 1);
    }
  };

  const finishQuiz = () => {
    const score = questions.filter((question, i) =>
      answers[i] && isCorrectAnswer(answers[i], question.correct_answer)
    ).length;

    const topicMap = {};
    questions.forEach((question, i) => {
      const t = question.topic || question.subject || 'General';
      if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
      topicMap[t].total++;
      if (answers[i] && isCorrectAnswer(answers[i], question.correct_answer)) topicMap[t].correct++;
    });

    const attempt = {
      date: new Date().toISOString(),
      score,
      total: questions.length,
      time_seconds: elapsed,
      answers,
      topic_breakdown: topicMap,
    };
    saveAttempt(quiz.id, attempt);
    onComplete({ ...quiz, lastAttempt: attempt });
  };

  if (!q) return null;

  const displayTitle = title || quiz.title || 'Quiz';
  const isCorrectOpt = (opt) => isCorrectAnswer(opt, q.correct_answer);

  const getOptionStyle = (opt) => {
    if (isChecked) {
      // practice checked state
      if (isCorrectOpt(opt)) return 'border-accent-secondary bg-accent-secondary text-white';
      if (opt === selected) return 'border-error bg-error text-white';
      return 'border-border bg-bg-secondary text-text-tertiary opacity-40';
    }
    if (opt === selected) return 'border-accent-primary bg-text-primary text-bg-primary font-semibold';
    return 'border-border bg-bg-secondary text-text-primary hover:border-accent-primary/60 hover:bg-bg-tertiary';
  };

  const getLetterStyle = (opt) => {
    if (isChecked) {
      if (isCorrectOpt(opt)) return 'border-white text-white';
      if (opt === selected) return 'border-white text-white';
    }
    if (opt === selected) return 'border-bg-primary text-bg-primary bg-transparent';
    return 'border-border text-text-secondary';
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Exit confirmation modal ── */}
      {showExitConfirm && (
        <ConfirmModal
          title="Exit quiz?"
          message="Your progress will be lost. Are you sure you want to leave?"
          confirmLabel="Exit"
          onConfirm={onExit}
          onCancel={() => setShowExitConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="h-[60px] border-b border-border flex items-center gap-2 sm:gap-4 px-4 sm:px-6 shrink-0 bg-bg-primary">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-error transition-colors shrink-0"
        >
          <X size={15} /> Cancel
        </button>
        <div className="h-5 w-px bg-border" />
        <span className="text-[13px] sm:text-[14px] font-bold text-text-primary whitespace-nowrap hidden sm:block">Gavel Study</span>
        <div className="h-5 w-px bg-border hidden sm:block" />
        <span className="text-[11px] sm:text-[12px] font-semibold text-text-secondary uppercase tracking-wide truncate max-w-[120px] sm:max-w-[200px]">
          {displayTitle}
        </span>
        <div className="flex-1" />
        <span className="text-[11px] sm:text-[13px] text-text-secondary whitespace-nowrap">
          {idx + 1}/{questions.length}
        </span>
        <span className="text-[11px] sm:text-[13px] text-text-secondary whitespace-nowrap hidden sm:block">{pct}%</span>
        <div className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg ${
          durationSecs > 0 && durationSecs - elapsed <= 60
            ? 'bg-error/10 text-error'
            : 'bg-orange-400/10 text-orange-400'
        }`}>
          <Clock size={12} />
          <span className="text-[12px] sm:text-[13px] font-mono font-semibold">
            {durationSecs > 0 ? formatTime(Math.max(0, durationSecs - elapsed)) : formatTime(elapsed)}
          </span>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="h-[3px] bg-bg-tertiary shrink-0">
        <div className="h-full bg-accent-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* ── Question palette — always visible ── */}
      <div className="border-b border-border px-4 sm:px-6 py-3 flex gap-1.5 flex-wrap bg-bg-secondary shrink-0">
        {questions.map((_, i) => (
          <button key={i} onClick={() => navigate(i)}
            className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${
              i === idx            ? 'bg-accent-primary text-white'
              : flagged.has(i)    ? 'bg-orange-400/15 text-orange-400 border border-orange-400/40'
              : checked.has(i) || (mode === 'exam' && answers[i]) ? 'bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/30'
              : answers[i]        ? 'bg-bg-tertiary text-text-primary border border-border'
              : 'bg-bg-tertiary text-text-tertiary border border-border'
            }`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* ── Question content (scrollable) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-5">

          {/* Subject tag */}
          {(q.subject || q.topic) && (
            <div>
              <span className="inline-block bg-text-primary text-bg-primary text-[11px] font-semibold px-3 py-1 rounded-full">
                {q.subject || q.topic}
              </span>
            </div>
          )}

          {/* Question text */}
          <h2 className="text-[20px] sm:text-[22px] font-bold text-text-primary leading-snug">{q.question}</h2>

          {/* Case / statute blockquote */}
          {(q.scenario || q.statute_text) && (
            <blockquote className="border-l-4 border-accent-primary/50 pl-4 py-1">
              <p className="text-[14px] text-text-secondary italic leading-relaxed">
                "{q.scenario || q.statute_text}"
              </p>
            </blockquote>
          )}

          {/* Feedback (practice mode, after check) */}
          {isChecked && (
            <div className={`p-4 rounded-xl border text-[13px] leading-relaxed ${
              isCorrectAnswer(selected, q.correct_answer)
                ? 'bg-accent-secondary/10 border-accent-secondary/30'
                : 'bg-error/10 border-error/30'
            }`}>
              <p className={`font-semibold mb-1.5 ${isCorrectAnswer(selected, q.correct_answer) ? 'text-accent-secondary' : 'text-error'}`}>
                {isCorrectAnswer(selected, q.correct_answer) ? '✓ Correct!' : `✗ Incorrect — correct answer: ${q.correct_answer}`}
              </p>
              <p className="text-text-primary leading-relaxed">{q.explanation}</p>

              {q.case_references?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {q.case_references.map((c, i) => (
                    <span key={i} className="text-[10px] bg-bg-tertiary px-2 py-0.5 rounded text-text-tertiary">{c}</span>
                  ))}
                </div>
              )}
              {q.statute_references?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.statute_references.map((s, i) => (
                    <span key={i} className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}

              {/* Study tip + Add to flashcards (wrong answers only) */}
              {!isCorrectAnswer(selected, q.correct_answer) && (
                <div className="mt-3 pt-3 border-t border-error/20 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-text-secondary">
                    💡 <strong>Study tip:</strong> {q.statute_references?.length > 0
                      ? `Review ${q.statute_references[0]}`
                      : q.case_references?.length > 0
                        ? `Study ${q.case_references[0]}`
                        : `Review ${q.topic || q.subject || 'this topic'} in your notes`}
                  </p>
                  <button
                    onClick={() => handleAddToFlashcards(q)}
                    disabled={savedCards.has(idx)}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all shrink-0 disabled:opacity-60 disabled:cursor-default border-accent-primary/30 text-accent-primary hover:bg-accent-primary/10">
                    {savedCards.has(idx) ? <><Check size={11} /> Saved</> : <><Layers size={11} /> Add to Flashcards</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Options — pinned above footer ── */}
      <div className="shrink-0 border-t border-border bg-bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => !isChecked && handleSelect(opt)}
                disabled={isChecked}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${getOptionStyle(opt)} disabled:cursor-default`}
              >
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-[12px] font-bold mt-0.5 ${getLetterStyle(opt)}`}>
                  {getOptionLetter(opt)}
                </div>
                <span className="text-[13px] leading-relaxed">{getOptionText(opt)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="h-[60px] border-t border-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-bg-primary">
        <button onClick={() => navigate(Math.max(0, idx - 1))} disabled={idx === 0}
          className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          ← Previous
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })}
            className={`p-2 rounded-lg transition-all ${flagged.has(idx) ? 'text-orange-400 bg-orange-400/10' : 'text-text-tertiary hover:text-orange-400'}`}
            title="Flag for review">
            <Flag size={15} />
          </button>

          {mode === 'practice' && !isChecked && (
            <button onClick={handleCheck} disabled={!selected}
              className="px-4 py-2 text-[13px] font-medium border border-border rounded-lg text-text-secondary hover:border-accent-primary hover:text-accent-primary disabled:opacity-40 transition-all">
              Check Answer
            </button>
          )}

          <button onClick={handleNext}
            disabled={mode === 'exam' && !selected}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              isLast && mode === 'exam'
                ? 'bg-orange-400 hover:bg-orange-500 text-white'
                : 'bg-accent-primary hover:bg-accent-hover text-white disabled:opacity-40'
            }`}>
            {isLast
              ? (mode === 'exam' ? 'Submit Exam ✓' : 'See Results')
              : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Results Screen ────────────────────────────────────────────────────────────
const ResultsScreen = ({ quiz, attempt, onRetake, onExit }) => {
  const [reviewIdx, setReviewIdx] = useState(null);
  const questions = quiz.questions || [];
  const pct = Math.round((attempt.score / attempt.total) * 100);
  const formatTime = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const topicBreakdown = attempt.topic_breakdown || {};

  if (reviewIdx !== null) {
    const q = questions[reviewIdx];
    const userAnswer = attempt.answers?.[reviewIdx];
    const correct = userAnswer && (userAnswer.startsWith(q.correct_answer) || userAnswer === q.correct_answer);
    const typeCfg = TYPE_CONFIG[q.question_type] || TYPE_CONFIG.mcq;
    const TypeIcon = typeCfg.icon;

    return (
      <div className="flex flex-col h-full">
        <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setReviewIdx(null)} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-[13px]">
            <ChevronLeft size={16} /> Back to results
          </button>
          <p className="text-[13px] font-semibold text-text-primary">Question {reviewIdx + 1} of {questions.length}</p>
          <div className="flex gap-1">
            <button disabled={reviewIdx === 0} onClick={() => setReviewIdx(i => i - 1)}
              className="px-3 py-1.5 text-[12px] border border-border rounded-lg disabled:opacity-30 text-text-secondary hover:text-text-primary">←</button>
            <button disabled={reviewIdx === questions.length - 1} onClick={() => setReviewIdx(i => i + 1)}
              className="px-3 py-1.5 text-[12px] border border-border rounded-lg disabled:opacity-30 text-text-secondary hover:text-text-primary">→</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${typeCfg.color}`}>
                <TypeIcon size={9} /> {typeCfg.label}
              </span>
              {q.difficulty && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
                  {q.difficulty}
                </span>
              )}
            </div>

            {q.scenario && (
              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-2">Scenario</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{q.scenario}</p>
              </div>
            )}
            {q.statute_text && (
              <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-widest mb-2">Statute</p>
                <p className="text-[13px] text-text-secondary leading-relaxed italic">{q.statute_text}</p>
              </div>
            )}

            <p className="text-text-primary text-[16px] leading-relaxed font-medium">{q.question}</p>

            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const isCorrect = opt.startsWith(q.correct_answer) || opt === q.correct_answer;
                const isWrong = opt === userAnswer && !isCorrect;
                let style = 'border-border bg-bg-secondary text-text-tertiary opacity-40';
                if (isCorrect) style = 'border-accent-secondary bg-accent-secondary/25 text-accent-secondary font-semibold';
                else if (isWrong) style = 'border-error bg-error/10 text-error';
                return (
                  <div key={opt} className={`px-4 py-3 rounded-xl border text-[13px] ${style}`}>
                    {opt} {isCorrect ? '✓' : isWrong ? '✗' : ''}
                  </div>
                );
              })}
            </div>

            <div className={`p-4 rounded-xl border text-[13px] ${correct ? 'bg-accent-secondary/10 border-accent-secondary/30' : 'bg-error/10 border-error/30'}`}>
              <p className={`font-semibold mb-2 ${correct ? 'text-accent-secondary' : 'text-error'}`}>
                {correct ? '✓ You got this right' : `✗ Correct answer: ${q.correct_answer}`}
              </p>
              <p className="text-text-primary leading-relaxed">{q.explanation}</p>
              {q.case_references?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {q.case_references.map((c, i) => (
                    <span key={i} className="text-[10px] bg-bg-tertiary px-2 py-0.5 rounded text-text-tertiary">{c}</span>
                  ))}
                </div>
              )}
              {q.statute_references?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.statute_references.map((s, i) => (
                    <span key={i} className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
        <button onClick={onExit} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-[13px]">
          <ChevronLeft size={16} /> Back to quizzes
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          {/* Score summary */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
              <Trophy size={36} />
            </div>
            <h2 className="font-display text-3xl text-text-primary mb-1">Quiz Complete!</h2>
            <p className="text-text-secondary text-[14px] mb-6">{quiz.title}</p>

            <div className="flex gap-8 mb-6">
              <div className="text-center">
                <p className="font-display text-4xl text-accent-primary">{attempt.score}/{attempt.total}</p>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest mt-1">Score</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl text-text-primary">{pct}%</p>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest mt-1">Percentage</p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl text-text-primary">{formatTime(attempt.time_seconds)}</p>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest mt-1">Time</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onRetake} className="flex items-center gap-2 border border-border bg-bg-secondary px-5 py-2.5 rounded-xl text-[13px] text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-all">
                <RotateCcw size={14} /> Retake
              </button>
              <button onClick={() => setReviewIdx(0)} className="flex items-center gap-2 border border-border bg-bg-secondary px-5 py-2.5 rounded-xl text-[13px] text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-all">
                <BookOpen size={14} /> Review Answers
              </button>
              <button onClick={onExit} className="bg-accent-primary hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all">
                Done
              </button>
            </div>
          </div>

          {/* Per-topic breakdown */}
          {Object.keys(topicBreakdown).length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary mb-3">Performance by Topic</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(topicBreakdown).map(([topic, data]) => {
                  const topicPct = Math.round((data.correct / data.total) * 100);
                  return (
                    <div key={topic} className="bg-bg-secondary border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-medium text-text-primary">{topic}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-text-tertiary">{data.correct}/{data.total}</span>
                          <span className={`text-[12px] font-semibold ${topicPct >= 70 ? 'text-accent-secondary' : topicPct >= 50 ? 'text-orange-400' : 'text-error'}`}>
                            {topicPct}%
                          </span>
                          {topicPct < 60 && <AlertCircle size={12} className="text-error" />}
                        </div>
                      </div>
                      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${topicPct >= 70 ? 'bg-accent-secondary' : topicPct >= 50 ? 'bg-orange-400' : 'bg-error'}`}
                          style={{ width: `${topicPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Quiz Time Ago ─────────────────────────────────────────────────────────────
const quizTimeAgo = (dateStr) => {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
};

// ─── Quiz Share Modal ──────────────────────────────────────────────────────────
const QuizShareModal = ({ quiz, onClose, onShared }) => {
  const [shareId, setShareId]     = useState(quiz.is_public ? quiz.share_id : null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const shareLink = shareId ? `${window.location.origin}${window.location.pathname}?quiz=${shareId}` : null;
  const shareCode = shareId ? String(shareId).slice(0, 8).toUpperCase() : null;

  const handleShare = async () => {
    setIsLoading(true);
    const id = await shareQuiz(quiz.id);
    if (id) { setShareId(id); onShared(quiz.id, id); }
    setIsLoading(false);
  };

  const handleUnshare = async () => {
    await unshareQuiz(quiz.id);
    setShareId(null);
    onShared(quiz.id, null);
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
            <h3 className="text-[14px] font-semibold text-text-primary">Share Quiz</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!shareId ? (
            <>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                Generate a share link so others can take this quiz. Anyone with the link can access it.
              </p>
              <button onClick={handleShare} disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {isLoading ? 'Generating…' : 'Generate Share Link'}
              </button>
            </>
          ) : (
            <>
              <div className="bg-accent-secondary/10 border border-accent-secondary/30 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-accent-secondary uppercase tracking-widest mb-1">Quiz is public</p>
                <p className="text-[12px] text-text-secondary">Anyone with the link can take this quiz.</p>
              </div>

              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-2">Share link</p>
                <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-[12px] text-text-secondary truncate">{shareLink}</span>
                  <button onClick={() => copy(shareLink, setCopiedLink)}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-accent-primary transition-all">
                    {copiedLink ? <><CheckCheck size={11} className="text-accent-secondary" /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-2">Share code</p>
                <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-[14px] font-mono font-bold text-text-primary tracking-widest">{shareCode}</span>
                  <button onClick={() => copy(shareCode, setCopiedCode)}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-accent-primary transition-all">
                    {copiedCode ? <><CheckCheck size={11} className="text-accent-secondary" /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>

              <button onClick={handleUnshare}
                className="text-[12px] text-text-tertiary hover:text-error transition-colors text-left">
                Make private — disable link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Quiz Card ─────────────────────────────────────────────────────────────────
const QuizCard = ({ quiz, onStart, onDelete, onShare }) => {
  const attempts = quiz.attempts || [];
  const best     = attempts.length ? Math.max(...attempts.map(a => Math.round((a.score / a.total) * 100))) : null;

  return (
    <div onClick={onStart}
      className="bg-bg-secondary border border-border rounded-2xl p-5 sm:p-7 cursor-pointer hover:shadow-lg transition-all group flex flex-col justify-between relative"
      style={{ width: '400px', height: '450px' }}>

      {/* Hover actions — top right */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={e => { e.stopPropagation(); onShare(quiz); }}
          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${quiz.is_public ? 'border-accent-secondary/40 text-accent-secondary bg-accent-secondary/10' : 'border-border text-text-tertiary hover:text-accent-primary hover:border-accent-primary/40'}`}>
          <Share2 size={10} /> {quiz.is_public ? 'Shared' : 'Share'}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(quiz.id); }}
          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-text-tertiary hover:text-error hover:border-error/40 transition-all">
          <Trash2 size={10} /> Delete
        </button>
      </div>

      {/* Top section */}
      <div className="flex flex-col gap-5 pr-16">
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest">{quizTimeAgo(quiz.created_at)}</p>

        <h3 className="font-display text-[26px] font-bold text-text-primary leading-snug">
          {quiz.title}
        </h3>

        <div className="flex flex-wrap gap-2">
          {[
            quiz.quiz_type ? quiz.quiz_type.charAt(0).toUpperCase() + quiz.quiz_type.slice(1) : null,
            `${quiz.questions?.length || 0} questions`,
            quiz.duration_minutes > 0 ? `${quiz.duration_minutes} min` : null,
            quiz.mode === 'exam' ? 'Exam' : 'Practice',
          ].filter(Boolean).map(tag => (
            <span key={tag} className="text-[13px] text-text-secondary bg-bg-tertiary px-4 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-border" />
        <div className="flex items-center justify-between">
          <div>
            {best !== null ? (
              <>
                <p className="text-[16px] font-bold text-text-primary">Best: {best}%</p>
                <p className="text-[12px] text-text-tertiary mt-1">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-bold text-text-primary">Not attempted</p>
                <p className="text-[12px] text-text-tertiary mt-1">Take your first attempt</p>
              </>
            )}
          </div>
          <button className="bg-accent-primary text-bg-primary px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-80">
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────────
const Quizzes = ({ profile, activePlan }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareQuizTarget, setShareQuizTarget] = useState(null);

  useEffect(() => { fetchQuizzes().then(d => { setQuizzes(d); setIsLoading(false); }); }, []);

  const handleGenerated = (quiz) => {
    setQuizzes(prev => [quiz, ...prev]);
    setShowModal(false);
    setActiveQuiz(quiz);
    setActiveAttempt(null);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (id) => {
    await deleteQuiz(id);
    setQuizzes(prev => prev.filter(q => q.id !== id));
    setConfirmDeleteId(null);
  };

  const handleShared = (quizId, shareId) => {
    setQuizzes(prev => prev.map(q =>
      q.id === quizId ? { ...q, is_public: !!shareId, share_id: shareId } : q
    ));
  };

  const handleComplete = (quizWithAttempt) => {
    setQuizzes(prev => prev.map(q =>
      q.id === quizWithAttempt.id
        ? { ...q, attempts: [...(q.attempts || []), quizWithAttempt.lastAttempt] }
        : q
    ));
    setActiveAttempt(quizWithAttempt.lastAttempt);
  };

  if (activeQuiz && activeAttempt) {
    return <ResultsScreen quiz={activeQuiz} attempt={activeAttempt}
      onRetake={() => setActiveAttempt(null)}
      onExit={() => { setActiveQuiz(null); setActiveAttempt(null); }} />;
  }

  if (activeQuiz && !activeAttempt) {
    return <QuizSession quiz={activeQuiz} onExit={() => setActiveQuiz(null)} onComplete={handleComplete} title={activeQuiz.title?.toUpperCase()} />;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <CheckSquare size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Quizzes</h2>
            <p className="text-[10px] text-text-tertiary">{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-[13px] font-medium transition-all shadow-md shadow-accent-primary/20">
          <Plus size={14} /> New Quiz
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-text-tertiary" /></div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
              <CheckSquare size={28} />
            </div>
            <h2 className="font-display text-2xl text-text-primary mb-3">No quizzes yet</h2>
            <p className="text-text-secondary text-[14px] max-w-sm mb-7 leading-relaxed">
              Generate scenario-based Nigerian bar exam quizzes — topic, subject, or mixed — with instant feedback and detailed explanations.
            </p>
            <button onClick={() => setShowModal(true)}
              className="bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-[14px] font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2">
              <Sparkles size={15} /> Generate First Quiz
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz}
                  onStart={() => { setActiveQuiz(quiz); setActiveAttempt(null); }}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  onShare={(q) => setShareQuizTarget(q)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && <GenerateModal onClose={() => setShowModal(false)} onGenerated={handleGenerated} profile={profile} activePlan={activePlan} />}
      {shareQuizTarget && (
        <QuizShareModal
          quiz={shareQuizTarget}
          onClose={() => setShareQuizTarget(null)}
          onShared={handleShared}
        />
      )}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete quiz?"
          message="This quiz and all its attempt history will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

export default Quizzes;

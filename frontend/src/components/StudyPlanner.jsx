import API_URL from '../lib/api';
import { useState, useEffect } from 'react';
import {
  Calendar, Loader2, Trash2, ChevronLeft, ChevronRight,
  BookOpen, CheckSquare, FileText, RotateCcw, Scale, Sparkles,
  X, Check, Pencil, ChevronDown, RefreshCw, AlertCircle,
  MessageSquare, Layers,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { saveNote } from '../lib/notes';
import { fetchActivePlan, savePlan, fetchCompletedTasks, toggleTask, deletePlan } from '../lib/planner';
import { fetchAnalyticsData, computeAnalytics } from '../lib/analytics';

const EXAM_TYPES = [
  '1st Semester Exam', '2nd Semester Exam', 'Mid-Semester Exam',
  'LLB Finals', 'Bar Part I', 'Bar Finals',
];

const ALL_SUBJECTS = [
  'Constitutional Law', 'Criminal Law and Procedure', 'Civil Procedure',
  'Law of Contract', 'Law of Torts', 'Equity and Trusts',
  'Company Law and Partnership', 'Land Law', 'Professional Ethics', 'Evidence',
];

const ACTIVITY_CONFIG = {
  reading:    { icon: BookOpen,    label: 'Reading',    color: 'text-blue-400',   bg: 'bg-blue-400/10',   dot: 'bg-blue-400' },
  quiz:       { icon: CheckSquare, label: 'Quiz',       color: 'text-violet-400', bg: 'bg-violet-400/10', dot: 'bg-violet-400' },
  essay:      { icon: FileText,    label: 'Essay',      color: 'text-orange-400', bg: 'bg-orange-400/10', dot: 'bg-orange-400' },
  review:     { icon: RotateCcw,   label: 'Review',     color: 'text-green-400',  bg: 'bg-green-400/10',  dot: 'bg-green-400' },
  simulation: { icon: Scale,       label: 'Simulation', color: 'text-red-400',    bg: 'bg-red-400/10',    dot: 'bg-red-400' },
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const ACADEMIC_LEVELS = ['100L', '200L', '300L', '400L', '500L', 'Nigerian Law School'];

const taskKey  = (week, day, idx) => `${week}-${day}-${idx}`;
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - Date.now()) / 86400000);

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Calendar task card (compact) ──────────────────────────────────────────────
const CalendarTask = ({ task, weekNum, dayName, idx, completed, onToggle, onAskGavin, setActiveModule }) => {
  const cfg = ACTIVITY_CONFIG[task.activity] || ACTIVITY_CONFIG.reading;
  const [generatingNote, setGeneratingNote] = useState(false);

  const handleStudySession = (e) => {
    e.stopPropagation();
    const prompt = `Let's have a focused study session on "${task.topic}" in ${task.subject}.${task.goal ? ` My goal: ${task.goal}.` : ''} Please guide me through the key principles, relevant Nigerian cases and statutes, and how they apply in practice.`;
    onAskGavin?.(prompt);
  };

  const handleOpenMaterial = async (e) => {
    e.stopPropagation();
    if (generatingNote) return;
    setGeneratingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/notes/generate-from-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: task.subject, topic: task.topic }),
      });
      if (!res.ok) throw new Error('Failed to generate note');
      const data = await res.json();
      await saveNote({ title: data.title, filename: data.filename, summary: data, tags: [task.subject] });
      setActiveModule?.('notes');
    } catch (err) {
      console.error('Failed to generate note:', err);
    } finally {
      setGeneratingNote(false);
    }
  };

  return (
    <div className={`rounded-lg border transition-all ${completed ? 'opacity-50 border-border bg-bg-tertiary' : `${cfg.bg} border-transparent`}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(weekNum, dayName, idx, !completed); }}
        className="w-full text-left px-2.5 pt-2 pb-1.5"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`text-[10px] font-semibold truncate ${completed ? 'text-text-tertiary' : cfg.color}`}>
            {cfg.label} · {task.hours}h
          </span>
          {completed && <Check size={9} className="ml-auto shrink-0 text-green-400" />}
        </div>
        <p className={`text-[12px] font-medium leading-tight truncate ${completed ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
          {task.subject}
        </p>
        <p className="text-[11px] text-text-secondary truncate mt-0.5">{task.topic}</p>
      </button>

      {!completed && (
        <div className="px-2.5 pb-2 flex gap-1.5 flex-wrap">
          <button
            onClick={handleStudySession}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-bg-primary/60 hover:bg-bg-primary text-text-secondary hover:text-accent-primary border border-transparent hover:border-border transition-all"
          >
            <MessageSquare size={10} /> Study Session
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setActiveModule?.('flashcards'); }}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-bg-primary/60 hover:bg-bg-primary text-text-secondary hover:text-violet-400 border border-transparent hover:border-border transition-all"
          >
            <Layers size={10} /> Flashcards
          </button>
          <button
            onClick={handleOpenMaterial}
            disabled={generatingNote}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-bg-primary/60 hover:bg-bg-primary text-text-secondary hover:text-green-400 border border-transparent hover:border-border transition-all disabled:opacity-50"
          >
            {generatingNote ? <Loader2 size={10} className="animate-spin" /> : <BookOpen size={10} />}
            {generatingNote ? 'Generating…' : 'Open Material'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Day Row (vertical layout) ────────────────────────────────────────────────
const DayRow = ({ date, tasks, weekNum, dayName, isToday, isPast, completedKeys, onToggle, onAskGavin, setActiveModule }) => {
  const [expanded, setExpanded] = useState(isToday);
  const LIMIT = 3;
  const visible  = expanded ? tasks : tasks.slice(0, LIMIT);
  const overflow = tasks.length - LIMIT;
  const doneCount = tasks.filter((_, i) => completedKeys.has(taskKey(weekNum, dayName, i))).length;
  const isOutOfRange = weekNum === null || weekNum < 1;
  const shortDay = dayName.slice(0, 3).toUpperCase();
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className={`border-b border-border last:border-0 ${isOutOfRange ? 'opacity-30' : ''}`}>
      {/* Day header row */}
      <button
        onClick={() => tasks.length > 0 && setExpanded(e => !e)}
        className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
          isToday ? 'bg-accent-primary/[0.04]' : isPast ? 'bg-bg-secondary/20' : 'bg-bg-primary'
        } ${tasks.length > 0 ? 'hover:bg-bg-secondary/40 cursor-pointer' : 'cursor-default'}`}
      >
        {/* Day label */}
        <div className="w-16 shrink-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-accent-primary' : 'text-text-tertiary'}`}>{shortDay}</p>
          <p className={`text-[15px] font-bold leading-none mt-0.5 ${isToday ? 'text-accent-primary' : isPast ? 'text-text-tertiary' : 'text-text-primary'}`}>{dateStr}</p>
        </div>

        {/* Task preview / empty */}
        <div className="flex-1 min-w-0">
          {tasks.length === 0 ? (
            <p className="text-[12px] text-text-tertiary italic">Rest day</p>
          ) : expanded ? (
            <p className="text-[12px] text-text-secondary">{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {doneCount} done</p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {tasks.slice(0, 2).map((t, i) => {
                const cfg = ACTIVITY_CONFIG[t.activity] || ACTIVITY_CONFIG.reading;
                return (
                  <span key={i} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} truncate max-w-[140px]`}>
                    {t.subject}
                  </span>
                );
              })}
              {tasks.length > 2 && <span className="text-[11px] text-text-tertiary">+{tasks.length - 2} more</span>}
            </div>
          )}
        </div>

        {/* Right: today badge + done check */}
        <div className="flex items-center gap-2 shrink-0">
          {isToday && <span className="text-[8px] font-bold text-accent-primary bg-accent-primary/15 px-2 py-0.5 rounded-full uppercase tracking-wide">Today</span>}
          {tasks.length > 0 && doneCount === tasks.length && <Check size={13} className="text-green-400" strokeWidth={2.5} />}
          {tasks.length > 0 && (
            <ChevronDown size={13} className={`text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* Expanded tasks */}
      {expanded && tasks.length > 0 && (
        <div className={`px-4 pb-3 flex flex-col gap-2 ${isToday ? 'bg-accent-primary/[0.02]' : isPast ? 'bg-bg-secondary/10' : ''}`}>
          {visible.map((task, i) => (
            <CalendarTask key={i} task={task} weekNum={weekNum} dayName={dayName} idx={i}
              completed={completedKeys.has(taskKey(weekNum, dayName, i))} onToggle={onToggle}
              onAskGavin={onAskGavin} setActiveModule={setActiveModule} />
          ))}
          {!expanded && overflow > 0 && (
            <button onClick={() => setExpanded(true)} className="text-[11px] text-accent-primary font-medium text-left pl-1">
              And {overflow} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Setup Wizard ──────────────────────────────────────────────────────────────
const SetupWizard = ({ onGenerated }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('');
  const [examType, setExamType] = useState('Bar Finals');
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [availableDays, setAvailableDays] = useState(new Set());
  const [academicLevel, setAcademicLevel] = useState('Nigerian Law School');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [scores, setScores] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customScope, setCustomScope] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (day) => {
    setAvailableDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().split('T')[0];

  const addSubjectFromList = (title) => {
    if (selectedSubjects.find(s => s.title === title)) return;
    setSelectedSubjects(prev => [...prev, { title, scope: '' }]);
    if (!(title in scores)) setScores(prev => ({ ...prev, [title]: 50 }));
    setShowPicker(false);
  };

  const addCustomSubject = () => {
    if (!customTitle.trim()) return;
    const title = customTitle.trim();
    if (selectedSubjects.find(s => s.title === title)) return;
    setSelectedSubjects(prev => [...prev, { title, scope: customScope.trim() }]);
    if (!(title in scores)) setScores(prev => ({ ...prev, [title]: 50 }));
    setCustomTitle(''); setCustomScope(''); setShowCustomForm(false);
  };

  const removeSubject = (title) => setSelectedSubjects(prev => prev.filter(s => s.title !== title));

  const updateScope = (title, scope) =>
    setSelectedSubjects(prev => prev.map(s => s.title === title ? { ...s, scope } : s));

  const handleGenerate = async () => {
    if (!examDate || selectedSubjects.length === 0 || isGenerating) return;
    setIsGenerating(true); setError('');
    try {
      const subjectTitles = selectedSubjects.map(s => typeof s === 'string' ? s : s.title);
      const subjectStrings = selectedSubjects.map(s =>
        typeof s === 'string' ? s : (s.scope ? `${s.title} (Scope: ${s.scope})` : s.title)
      );
      const availableDaysList = availableDays.size > 0 ? [...availableDays] : null;
      const body = {
        exam_type: examType, exam_date: examDate,
        study_hours_per_day: hoursPerDay, subjects: subjectStrings, mode,
        academic_level: mode === 'cold_start' ? academicLevel : null,
        available_days: availableDaysList,
        diagnostic_results: mode === 'diagnostic'
          ? Object.fromEntries(selectedSubjects.map(s => [s.title, scores[s.title] ?? 50]))
          : {},
      };
      const res = await fetch(`${API_URL}/api/planner/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const saved = await savePlan({
        exam_type: examType, exam_date: examDate,
        study_hours_per_day: hoursPerDay, subjects: subjectTitles, mode,
        academic_level: mode === 'cold_start' ? academicLevel : null,
        diagnostic_results: body.diagnostic_results, plan: data,
      });
      if (saved) onGenerated(saved);
      else throw new Error('Failed to save plan to database.');
    } catch (err) {
      setError(err.message || 'Failed to generate plan. Make sure the AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-lg">
        <div className="flex gap-1.5 mb-8">
          {[1,2,3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-accent-primary' : 'bg-bg-tertiary'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">Where are you starting from?</h2>
              <p className="text-text-secondary text-[14px]">This helps us build the right kind of plan for you.</p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { value: 'cold_start', title: 'Starting fresh', desc: "I'm a beginner or starting a new semester. Build me a curriculum-driven plan from the ground up." },
                { value: 'diagnostic', title: 'I have prior knowledge', desc: "I'm a returning student. Build me a performance-driven plan focused on my weak areas." },
              ].map(opt => (
                <button key={opt.value} onClick={() => setMode(opt.value)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                    mode === opt.value ? 'border-accent-primary bg-accent-primary/5' : 'border-border bg-bg-secondary hover:border-accent-primary/40'
                  }`}>
                  <p className={`text-[14px] font-semibold mb-1 ${mode === opt.value ? 'text-accent-primary' : 'text-text-primary'}`}>{opt.title}</p>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!mode}
              className="w-full bg-accent-primary hover:bg-accent-hover disabled:opacity-40 text-white py-3 rounded-xl text-[14px] font-medium transition-all">
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">Exam details</h2>
              <p className="text-text-secondary text-[14px]">Tell us about your upcoming exam.</p>
            </div>
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Exam type</label>
              <div className="flex flex-wrap gap-2">
                {EXAM_TYPES.map(t => (
                  <button key={t} onClick={() => setExamType(t)}
                    className={`px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                      examType === t ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border bg-bg-secondary text-text-secondary hover:border-accent-primary/40'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Exam date</label>
              <input type="date" value={examDate} min={minDateStr} onChange={e => setExamDate(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary outline-none focus:border-accent-primary/40" />
            </div>
            {mode === 'cold_start' && (
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Academic level</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACADEMIC_LEVELS.map(lvl => (
                    <button key={lvl} onClick={() => setAcademicLevel(lvl)}
                      className={`py-2.5 rounded-xl text-[12px] font-medium border transition-all ${
                        academicLevel === lvl ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border bg-bg-secondary text-text-secondary hover:border-accent-primary/40'
                      }`}>{lvl}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">
                Study hours per day: <span className="text-accent-primary font-semibold">{hoursPerDay}h</span>
              </label>
              <input type="range" min="1" max="8" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-accent-primary" />
              <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>1h</span><span>8h</span></div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">
                Study days <span className="text-text-tertiary font-normal">(optional — leave blank to use default schedule)</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                      availableDays.has(day)
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border bg-bg-secondary text-text-secondary hover:border-accent-primary/40'
                    }`}
                  >
                    {SHORT_DAYS[i]}
                  </button>
                ))}
              </div>
              {availableDays.size > 0 && (
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-text-tertiary">{availableDays.size} day{availableDays.size !== 1 ? 's' : ''} selected</p>
                  <button type="button" onClick={() => setAvailableDays(new Set())} className="text-[11px] text-accent-primary hover:underline">Clear</button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all">← Back</button>
              <button onClick={() => setStep(3)} disabled={!examDate}
                className="flex-1 bg-accent-primary hover:bg-accent-hover disabled:opacity-40 text-white py-2.5 rounded-xl text-[14px] font-medium transition-all">
                Next: Select Subjects →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-display text-2xl text-text-primary mb-1">
                {mode === 'diagnostic' ? 'Rate your subjects' : 'Your courses'}
              </h2>
              <p className="text-text-secondary text-[14px]">
                Add each course with its scope — e.g. "Criminal Law I" covering actus reus, mens rea, homicide.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {selectedSubjects.map(({ title, scope }) => {
                const score = scores[title] ?? 50;
                return (
                  <div key={title} className="rounded-xl border border-accent-primary/40 bg-bg-secondary p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[13px] font-semibold text-text-primary">{title}</p>
                      <button onClick={() => removeSubject(title)} className="text-text-tertiary hover:text-red-400 transition-colors shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                    <input type="text" value={scope} onChange={e => updateScope(title, e.target.value)}
                      placeholder="Scope: e.g. Actus reus, mens rea, defences, homicide…"
                      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50" />
                    {mode === 'diagnostic' && (
                      <div className="mt-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-text-tertiary">Confidence</span>
                          <span className={`text-[11px] font-semibold ${score < 60 ? 'text-red-400' : 'text-green-400'}`}>{score}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={score}
                          onChange={e => setScores(prev => ({ ...prev, [title]: Number(e.target.value) }))}
                          className="w-full accent-accent-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedSubjects.length === 0 && (
                <p className="text-[13px] text-text-tertiary italic text-center py-4">No courses added yet.</p>
              )}
            </div>

            {showPicker && (
              <div className="border border-border rounded-xl bg-bg-primary max-h-[200px] overflow-y-auto">
                {ALL_SUBJECTS.filter(s => !selectedSubjects.find(x => x.title === s)).map(subject => (
                  <button key={subject} onClick={() => addSubjectFromList(subject)}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-text-primary hover:bg-bg-secondary transition-colors border-b border-border last:border-0">
                    {subject}
                  </button>
                ))}
              </div>
            )}

            {showCustomForm && (
              <div className="border border-border rounded-xl bg-bg-secondary p-4 flex flex-col gap-3">
                <p className="text-[12px] font-semibold text-text-primary">Add custom course</p>
                <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Course title — e.g. Criminal Law I" autoFocus
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50" />
                <input type="text" value={customScope} onChange={e => setCustomScope(e.target.value)}
                  placeholder="Scope — e.g. Actus reus, mens rea, homicide, defences"
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowCustomForm(false); setCustomTitle(''); setCustomScope(''); }}
                    className="px-3 py-2 text-[12px] text-text-secondary hover:text-text-primary rounded-lg">Cancel</button>
                  <button onClick={addCustomSubject} disabled={!customTitle.trim()}
                    className="flex-1 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white py-2 rounded-lg text-[12px] font-medium transition-all">
                    Add course
                  </button>
                </div>
              </div>
            )}

            {!showCustomForm && (
              <div className="flex gap-2">
                <button onClick={() => { setShowPicker(p => !p); setShowCustomForm(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-[13px] transition-all ${
                    showPicker ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-border text-text-secondary hover:border-accent-primary/40 hover:text-text-primary'
                  }`}>
                  <BookOpen size={13} /> Quick add
                </button>
                <button onClick={() => { setShowCustomForm(true); setShowPicker(false); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-text-secondary hover:border-accent-primary/40 hover:text-text-primary text-[13px] transition-all">
                  <Pencil size={13} /> Custom course
                </button>
              </div>
            )}

            {error && <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)}
                className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all">← Back</button>
              <button onClick={handleGenerate} disabled={selectedSubjects.length === 0 || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-40 text-white py-2.5 rounded-xl text-[14px] font-medium transition-all">
                {isGenerating
                  ? <><Loader2 size={15} className="animate-spin" /> Generating plan…</>
                  : <><Sparkles size={15} /> Generate My Study Plan</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Replan Modal ──────────────────────────────────────────────────────────────
const ReplanModal = ({ plan, onClose, onRegenerated }) => {
  const [scores, setScores]         = useState({});
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetchAnalyticsData().then(({ quizzes, completedTasks, plan: p }) => {
      const analytics = computeAnalytics(quizzes, completedTasks, p);
      const map = {};
      analytics.subjectProficiency.forEach(({ subject, score }) => { map[subject] = score; });
      setScores(map);
      setIsLoadingScores(false);
    });
  }, []);

  const subjects = plan.subjects || [];
  const getTitle = (s) => (typeof s === 'object' ? s.title : s);

  const handleReplan = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const subjectStrings = subjects.map(s =>
        typeof s === 'object' && s.scope ? `${s.title} (Scope: ${s.scope})` : getTitle(s)
      );
      const diagnosticResults = {};
      subjects.forEach(s => { diagnosticResults[getTitle(s)] = scores[getTitle(s)] ?? 50; });

      const res = await fetch(`${API_URL}/api/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_type: plan.exam_type,
          exam_date: plan.exam_date,
          study_hours_per_day: plan.study_hours_per_day,
          subjects: subjectStrings,
          mode: 'diagnostic',
          diagnostic_results: diagnosticResults,
          available_days: plan.available_days || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      await deletePlan(plan.id);
      const saved = await savePlan({
        exam_type: plan.exam_type,
        exam_date: plan.exam_date,
        study_hours_per_day: plan.study_hours_per_day,
        subjects: plan.subjects,
        mode: 'diagnostic',
        diagnostic_results: diagnosticResults,
        plan: data,
      });
      if (saved) onRegenerated(saved);
      else throw new Error('Failed to save regenerated plan.');
    } catch (err) {
      setError(err.message || 'Failed to regenerate. Make sure the AI service is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="text-accent-primary" />
            <h3 className="text-[14px] font-semibold text-text-primary">Regenerate Study Plan</h3>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 rounded"><X size={15} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            A new plan will be generated using your <strong>current quiz performance</strong> as the baseline.
            Weak subjects will get more study time.
          </p>

          {/* Subject scores */}
          <div className="bg-bg-primary border border-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-3">Current performance</p>
            {isLoadingScores ? (
              <div className="flex items-center gap-2 text-text-tertiary">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[12px]">Loading quiz scores…</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {subjects.map(s => {
                  const title = getTitle(s);
                  const score = scores[title];
                  return (
                    <div key={title} className="flex items-center justify-between">
                      <span className="text-[12px] text-text-primary truncate pr-3">{title}</span>
                      {score !== undefined ? (
                        <span className={`text-[12px] font-bold shrink-0 ${score >= 70 ? 'text-accent-secondary' : score >= 50 ? 'text-orange-400' : 'text-error'}`}>
                          {score}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-tertiary shrink-0">No data — defaults to 50%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-orange-400/5 border border-orange-400/20 rounded-xl">
            <AlertCircle size={13} className="text-orange-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-text-secondary">Your current task completion data will be lost. The new plan starts fresh.</p>
          </div>

          {error && <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2.5 text-[13px] text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all">
              Cancel
            </button>
            <button onClick={handleReplan} disabled={isLoadingScores || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-xl text-[13px] font-medium transition-all">
              {isGenerating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><RefreshCw size={13} /> Regenerate Plan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Planner Dashboard (Calendar View) ─────────────────────────────────────────
const PlannerDashboard = ({ plan, onDelete, onReplan, onAskGavin, setActiveModule }) => {
  const [completedKeys, setCompletedKeys] = useState(new Set());
  const [viewMonday, setViewMonday] = useState(() => getMonday(new Date()));
  const [showReplan, setShowReplan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const planStartMonday = getMonday(new Date(plan.created_at));
  const weeks = plan.plan?.weeks || [];
  const totalWeeks = plan.plan?.total_weeks || weeks.length;
  const daysLeft = daysUntil(plan.exam_date);
  const daysLeftColor = daysLeft <= 14 ? 'text-red-400' : daysLeft <= 30 ? 'text-orange-400' : 'text-green-400';

  useEffect(() => {
    fetchCompletedTasks(plan.id).then(tasks => {
      setCompletedKeys(new Set(tasks.map(t => taskKey(t.week_number, t.day_of_week, t.task_index))));
    });
  }, [plan.id]);

  const handleToggle = async (weekNum, day, taskIdx, completed) => {
    const key = taskKey(weekNum, day, taskIdx);
    setCompletedKeys(prev => {
      const next = new Set(prev);
      completed ? next.add(key) : next.delete(key);
      return next;
    });
    await toggleTask(plan.id, weekNum, day, taskIdx, completed);
  };

  const prevWeek = () => { const d = new Date(viewMonday); d.setDate(d.getDate() - 7); setViewMonday(d); };
  const nextWeek = () => { const d = new Date(viewMonday); d.setDate(d.getDate() + 7); setViewMonday(d); };
  const goToday  = () => setViewMonday(getMonday(new Date()));

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Build 7 day cells for the viewed week
  const weekDays = DAYS_OF_WEEK.map((dayName, i) => {
    const date = new Date(viewMonday);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.round((date - planStartMonday) / 86400000);
    const weekNum  = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : null;
    const planWeek = weekNum ? weeks.find(w => w.week === weekNum) : null;
    const planDay  = planWeek?.days?.find(d => d.day === dayName);

    return {
      date, dayName, weekNum,
      tasks: planDay?.tasks || [],
      isToday: date.getTime() === today.getTime(),
      isPast: date < today,
    };
  });

  // Header label — show month(s) covered by this week
  const lastDay = weekDays[6].date;
  const fmt = (d, opts) => d.toLocaleDateString('en-GB', opts);
  const monthLabel = fmt(viewMonday, { month: 'short' }) === fmt(lastDay, { month: 'short' })
    ? fmt(viewMonday, { month: 'long', year: 'numeric' })
    : `${fmt(viewMonday, { month: 'short' })} – ${fmt(lastDay, { month: 'short', year: 'numeric' })}`;

  // Current plan week (for subtitle)
  const todayDiff = Math.round((today - planStartMonday) / 86400000);
  const currentWeekNum = todayDiff >= 0 ? Math.floor(todayDiff / 7) + 1 : 1;
  const currentPlanWeek = weeks.find(w => w.week === currentWeekNum);

  // Week progress
  const allWeekTaskKeys = weekDays.flatMap(d =>
    d.weekNum ? d.tasks.map((_, ti) => taskKey(d.weekNum, d.dayName, ti)) : []
  );
  const weekDone = allWeekTaskKeys.filter(k => completedKeys.has(k)).length;
  const weekPct  = allWeekTaskKeys.length > 0 ? Math.round((weekDone / allWeekTaskKeys.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top header ── */}
      <header className="h-[60px] sm:h-[70px] border-b border-border flex items-center justify-between px-3 sm:px-6 bg-bg-primary/80 backdrop-blur-md shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary shrink-0">
            <Calendar size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] sm:text-sm font-semibold text-text-primary truncate">Study Planner</h2>
              <span className={`hidden sm:inline text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                plan.mode === 'cold_start' ? 'bg-blue-400/10 text-blue-400' : 'bg-violet-400/10 text-violet-400'
              }`}>
                {plan.mode === 'cold_start' ? 'Curriculum' : 'Adaptive'}
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary truncate">{plan.exam_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`text-center ${daysLeftColor}`}>
            <p className="text-[18px] sm:text-[22px] font-bold leading-none">{Math.max(0, daysLeft)}</p>
            <p className="text-[8px] sm:text-[9px] uppercase tracking-widest mt-0.5">days left</p>
          </div>
          <button onClick={() => setShowReplan(true)} title="Re-plan"
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-accent-primary hover:border-accent-primary/40 text-[12px] font-medium transition-all">
            <RefreshCw size={13} /> <span className="hidden sm:inline">Re-plan</span>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} title="Reset plan"
            className="p-1.5 sm:p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-bg-secondary transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {/* ── Calendar area ── */}
      <div className="flex-1 overflow-auto">

        {/* Calendar header: title + nav */}
        <div className="px-3 sm:px-6 pt-4 pb-3 border-b border-border flex items-start justify-between gap-2 sticky top-0 bg-bg-primary/95 backdrop-blur-md z-10">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] sm:text-[26px] text-text-primary leading-tight">{monthLabel}</h2>
            <p className="text-[11px] sm:text-[13px] text-text-secondary mt-0.5 line-clamp-2">
              {currentPlanWeek
                ? `Week ${currentWeekNum} of ${totalWeeks}${currentPlanWeek.theme ? ` · ${currentPlanWeek.theme}` : ''}`
                : `${totalWeeks}-week plan`}
              {allWeekTaskKeys.length > 0 && (
                <span className="hidden sm:inline ml-2 text-text-tertiary">· {weekDone}/{allWeekTaskKeys.length} tasks ({weekPct}%)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 mt-1 shrink-0">
            <button onClick={prevWeek}
              className="p-2 rounded-lg border border-border hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-all">
              <ChevronLeft size={15} />
            </button>
            <button onClick={goToday}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-[12px] font-medium transition-all">
              Today
            </button>
            <button onClick={nextWeek}
              className="p-2 rounded-lg border border-border hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-all">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Vertical day list */}
        <div className="flex flex-col">
          {weekDays.map(({ date, dayName, weekNum, tasks, isToday, isPast }, i) => (
            <DayRow
              key={i}
              date={date}
              tasks={tasks}
              weekNum={weekNum}
              dayName={dayName}
              isToday={isToday}
              isPast={isPast}
              completedKeys={completedKeys}
              onToggle={handleToggle}
              onAskGavin={onAskGavin}
              setActiveModule={setActiveModule}
            />
          ))}
        </div>

        {/* Week legend */}
        <div className="px-6 py-4 border-t border-border flex flex-wrap gap-4">
          {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-[11px] text-text-tertiary">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showReplan && (
        <ReplanModal
          plan={plan}
          onClose={() => setShowReplan(false)}
          onRegenerated={(newPlan) => { setShowReplan(false); onReplan?.(newPlan); }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete study plan?"
          message="Your study plan and all task completion data will be permanently deleted. This cannot be undone."
          confirmLabel="Delete Plan"
          onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────────
const StudyPlanner = ({ onPlanChange, onAskGavin, setActiveModule }) => {
  const [view, setView] = useState('loading');
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetchActivePlan().then(p => {
      setPlan(p); setView(p ? 'dashboard' : 'empty'); onPlanChange?.(p);
    });
  }, []);

  const handleGenerated = (savedPlan) => {
    setPlan(savedPlan); setView('dashboard'); onPlanChange?.(savedPlan);
  };

  const handleDelete = async () => {
    if (!plan) return;
    await deletePlan(plan.id);
    setPlan(null); setView('empty'); onPlanChange?.(null);
  };

  if (view === 'loading') return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-text-tertiary" />
    </div>
  );

  if (view === 'empty') return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Study Planner</h2>
            <p className="text-[10px] text-text-tertiary">AI-powered exam preparation</p>
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
          <Calendar size={28} />
        </div>
        <h2 className="font-display text-2xl text-text-primary mb-3">No study plan yet</h2>
        <p className="text-text-secondary text-[14px] max-w-sm mb-7 leading-relaxed">
          Create a personalised week-by-week schedule tailored to your exam date, subjects, and confidence levels.
        </p>
        <button onClick={() => setView('setup')}
          className="bg-accent-primary hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-[14px] font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2">
          <Sparkles size={15} /> Create My Study Plan
        </button>
      </div>
    </div>
  );

  if (view === 'setup') return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Calendar size={18} />
          </div>
          <h2 className="text-sm font-semibold text-text-primary">Study Planner</h2>
        </div>
        <button onClick={() => setView('empty')} className="p-2 text-text-tertiary hover:text-text-primary rounded-lg transition-colors">
          <X size={16} />
        </button>
      </header>
      <SetupWizard onGenerated={handleGenerated} />
    </div>
  );

  return <PlannerDashboard plan={plan} onDelete={handleDelete} onReplan={handleGenerated} onAskGavin={onAskGavin} setActiveModule={setActiveModule} />;
};

export default StudyPlanner;

import { useState, useEffect } from 'react';
import {
  User, GraduationCap, Clock, BookOpen, Shield,
  Pencil, Check, X, Loader2, CheckCircle2, Circle,
} from 'lucide-react';
import { saveProfile } from '../lib/profile';

const ACADEMIC_LEVELS = ['100L', '200L', '300L', '400L', '500L', 'Nigerian Law School', 'Graduate'];
const EXAM_TYPES = ['1st Semester Exam', '2nd Semester Exam', 'Mid-Semester Exam', 'LLB Finals', 'Bar Part I', 'Bar Finals', 'None'];
const STUDY_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const ALL_SUBJECTS = [
  'Constitutional Law', 'Criminal Law and Procedure', 'Civil Procedure',
  'Law of Contract', 'Law of Torts', 'Equity and Trusts',
  'Company Law and Partnership', 'Land Law', 'Professional Ethics', 'Evidence',
];

const NAV_ITEMS = [
  { id: 'personal',    label: 'Personal Info',     icon: User },
  { id: 'academic',    label: 'Academic Profile',  icon: GraduationCap },
  { id: 'preferences', label: 'Study Preferences', icon: Clock },
  { id: 'subjects',    label: 'Subjects',          icon: BookOpen },
  { id: 'account',     label: 'Account',           icon: Shield },
];

const COMPLETION_ITEMS = [
  { label: 'Full name',         pct: 15, check: f => !!f.full_name },
  { label: 'University',        pct: 10, check: f => !!f.university },
  { label: 'Academic level',    pct: 15, check: f => !!f.academic_level },
  { label: 'Target exam',       pct: 15, check: f => !!f.target_exam && f.target_exam !== 'None' },
  { label: 'Subjects selected', pct: 20, check: f => f.subjects?.length > 0 },
  { label: 'Bio',               pct: 10, check: f => !!f.bio },
  { label: 'Study preferences', pct: 15, check: f => !!f.preferred_study_time },
];

const inputCls = "w-full bg-bg-primary border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 transition-colors";
const readCls  = "text-[13px] font-medium text-text-primary";

// ── Circular progress ────────────────────────────────────────────────────────
const CircularProgress = ({ pct }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-bg-tertiary, #1A1F29)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#10B981" strokeWidth="12"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="middle"
        fill="var(--color-text-primary, #E2E8F0)" fontSize="22" fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
};

// ── Section wrapper ──────────────────────────────────────────────────────────
const SectionCard = ({ title, editing, onEdit, onSave, onCancel, saving, children }) => (
  <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
      <h3 className="text-[14px] font-semibold text-text-primary">{title}</h3>
      {!editing ? (
        <button onClick={onEdit}
          className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-accent-primary transition-colors">
          <Pencil size={13} /> Edit
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border transition-all">
            <X size={12} /> Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1 text-[12px] bg-accent-primary hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Save
          </button>
        </div>
      )}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">{label}</span>
    {children}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const UserProfile = ({ user, profile: initialProfile, onProfileSaved }) => {
  const [activeSection, setActiveSection] = useState('personal');
  const [form, setForm] = useState({
    full_name: '', university: '', bio: '',
    academic_level: 'Nigerian Law School', target_exam: 'Bar Finals',
    exam_date: '', study_hours_per_day: 3,
    preferred_study_time: 'Morning', subjects: [],
  });
  const [draft, setDraft]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (initialProfile) setForm(prev => ({ ...prev, ...initialProfile }));
  }, [initialProfile]);

  const completion = COMPLETION_ITEMS.reduce((sum, item) => sum + (item.check(form) ? item.pct : 0), 0);

  const startEdit  = (section) => { setDraft({ ...form }); setEditing(section); };
  const cancelEdit = () => { setEditing(null); setDraft(null); };

  const saveSection = async () => {
    setSaving(true);
    const saved = await saveProfile(user.id, draft);
    setSaving(false);
    if (saved) { setForm(draft); onProfileSaved?.(saved); }
    setEditing(null); setDraft(null);
  };

  const setD = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));
  const toggleSubjectDraft = (s) => setDraft(prev => ({
    ...prev,
    subjects: prev.subjects.includes(s)
      ? prev.subjects.filter(x => x !== s)
      : [...prev.subjects, s],
  }));

  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'GA';

  const activeForm = editing ? draft : form;

  // ── Section renderers ────────────────────────────────────────────────────
  const renderPersonal = () => (
    <SectionCard title="Personal Information" editing={editing === 'personal'}
      onEdit={() => startEdit('personal')} onSave={saveSection} onCancel={cancelEdit} saving={saving}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Full Name">
          {editing === 'personal'
            ? <input type="text" value={draft.full_name} onChange={e => setD('full_name', e.target.value)}
                placeholder="e.g. Chioma Nwosu" className={inputCls} />
            : <span className={readCls}>{form.full_name || <span className="text-text-tertiary italic">Not set</span>}</span>
          }
        </Field>
        <Field label="University">
          {editing === 'personal'
            ? <input type="text" value={draft.university} onChange={e => setD('university', e.target.value)}
                placeholder="e.g. University of Lagos" className={inputCls} />
            : <span className={readCls}>{form.university || <span className="text-text-tertiary italic">Not set</span>}</span>
          }
        </Field>
        <Field label="Email">
          <span className={readCls}>{user?.email}</span>
        </Field>
        <Field label="Member since">
          <span className={readCls}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
        </Field>
      </div>
    </SectionCard>
  );

  const renderBio = () => (
    <SectionCard title="Bio" editing={editing === 'bio'}
      onEdit={() => startEdit('bio')} onSave={saveSection} onCancel={cancelEdit} saving={saving}>
      {editing === 'bio'
        ? <textarea value={draft.bio} onChange={e => setD('bio', e.target.value)} rows={4}
            placeholder="Tell Gavin a bit about yourself…" className={`${inputCls} resize-none`} />
        : <p className="text-[13px] text-text-secondary leading-relaxed">
            {form.bio || <span className="italic text-text-tertiary">No bio yet. Click Edit to add one.</span>}
          </p>
      }
    </SectionCard>
  );

  const renderAcademic = () => (
    <SectionCard title="Academic Profile" editing={editing === 'academic'}
      onEdit={() => startEdit('academic')} onSave={saveSection} onCancel={cancelEdit} saving={saving}>
      <div className="flex flex-col gap-6">
        <Field label="Academic Level">
          {editing === 'academic'
            ? <div className="flex flex-wrap gap-2 mt-1">
                {ACADEMIC_LEVELS.map(lvl => (
                  <button key={lvl} onClick={() => setD('academic_level', lvl)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      draft.academic_level === lvl
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'
                    }`}>{lvl}</button>
                ))}
              </div>
            : <span className={readCls}>{form.academic_level || '—'}</span>
          }
        </Field>
        <Field label="Target Exam">
          {editing === 'academic'
            ? <div className="flex flex-wrap gap-2 mt-1">
                {EXAM_TYPES.map(ex => (
                  <button key={ex} onClick={() => setD('target_exam', ex)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      draft.target_exam === ex
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'
                    }`}>{ex}</button>
                ))}
              </div>
            : <span className={readCls}>{form.target_exam || '—'}</span>
          }
        </Field>
        <Field label="Expected Exam Date">
          {editing === 'academic'
            ? <input type="date" value={draft.exam_date || ''} onChange={e => setD('exam_date', e.target.value)} className={inputCls} />
            : <span className={readCls}>{form.exam_date || <span className="text-text-tertiary italic">Not set</span>}</span>
          }
        </Field>
      </div>
    </SectionCard>
  );

  const renderPreferences = () => (
    <SectionCard title="Study Preferences" editing={editing === 'preferences'}
      onEdit={() => startEdit('preferences')} onSave={saveSection} onCancel={cancelEdit} saving={saving}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label={`Study Hours / Day${editing === 'preferences' ? `: ${draft.study_hours_per_day}h` : ''}`}>
          {editing === 'preferences'
            ? <>
                <input type="range" min="1" max="10" value={draft.study_hours_per_day}
                  onChange={e => setD('study_hours_per_day', Number(e.target.value))}
                  className="w-full accent-accent-primary mt-2" />
                <div className="flex justify-between text-[10px] text-text-tertiary mt-1"><span>1h</span><span>10h</span></div>
              </>
            : <span className={readCls}>{form.study_hours_per_day}h per day</span>
          }
        </Field>
        <Field label="Preferred Study Time">
          {editing === 'preferences'
            ? <div className="flex gap-2 flex-wrap mt-1">
                {STUDY_TIMES.map(t => (
                  <button key={t} onClick={() => setD('preferred_study_time', t)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      draft.preferred_study_time === t
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'
                    }`}>{t}</button>
                ))}
              </div>
            : <span className={readCls}>{form.preferred_study_time}</span>
          }
        </Field>
      </div>
    </SectionCard>
  );

  const renderSubjects = () => (
    <SectionCard title="Subjects" editing={editing === 'subjects'}
      onEdit={() => startEdit('subjects')} onSave={saveSection} onCancel={cancelEdit} saving={saving}>
      {!editing && form.subjects.length === 0 && (
        <p className="text-[13px] text-text-tertiary italic">No subjects selected yet.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_SUBJECTS.map(s => {
          const isSelected = activeForm.subjects.includes(s);
          if (!editing && !isSelected) return null;
          return (
            <button key={s}
              onClick={() => editing === 'subjects' && toggleSubjectDraft(s)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                isSelected ? 'border-accent-primary/40 bg-accent-primary/5' : 'border-border bg-bg-primary hover:border-accent-primary/30'
              } ${!editing ? 'cursor-default' : 'cursor-pointer'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected ? 'border-accent-primary bg-accent-primary' : 'border-border'
              }`}>
                {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[12px] font-medium text-text-primary">{s}</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );

  const renderAccount = () => (
    <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-[14px] font-semibold text-text-primary">Account</h3>
      </div>
      <div className="px-6 py-5 flex flex-col gap-4">
        <Field label="Email Address"><span className={readCls}>{user?.email}</span></Field>
        <Field label="Auth Provider">
          <span className={readCls}>{user?.app_metadata?.provider === 'google' ? 'Google' : 'Email & Password'}</span>
        </Field>
        <Field label="Account Created">
          <span className={readCls}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
        </Field>
      </div>
    </div>
  );

  const sectionMap = {
    personal:    <>{renderPersonal()}{renderBio()}</>,
    academic:    renderAcademic(),
    preferences: renderPreferences(),
    subjects:    renderSubjects(),
    account:     renderAccount(),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[70px] border-b border-border flex items-center px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
      </header>

      {/* Mobile section tabs */}
      <div className="md:hidden flex overflow-x-auto border-b border-border bg-bg-secondary shrink-0">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveSection(id); cancelEdit(); }}
            className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all ${
              activeSection === id ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary'
            }`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* Left nav — hidden on mobile */}
        <aside className="hidden md:flex w-[200px] shrink-0 border-r border-border bg-bg-secondary flex-col py-4 px-3 gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest px-3 mb-2">Profile</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveSection(id); cancelEdit(); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeSection === id
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </aside>

        {/* Center content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {activeSection === 'personal' && (
              <div className="flex items-center gap-5 mb-6 bg-bg-secondary border border-border rounded-2xl px-6 py-5">
                <div className="w-16 h-16 rounded-2xl bg-accent-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-primary">{form.full_name || 'Set your name'}</p>
                  <p className="text-[12px] text-text-tertiary mt-0.5">{user?.email}</p>
                  {form.academic_level && (
                    <span className="inline-block mt-1.5 text-[10px] font-medium bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded-full">
                      {form.academic_level}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4">{sectionMap[activeSection]}</div>
          </div>
        </div>

        {/* Right — completion tracker, hidden on mobile */}
        <aside className="hidden lg:flex w-[220px] shrink-0 border-l border-border bg-bg-secondary flex-col py-6 px-4 overflow-y-auto">
          <h3 className="text-[13px] font-semibold text-text-primary mb-4">Complete your profile</h3>
          <div className="flex justify-center mb-4">
            <CircularProgress pct={completion} />
          </div>
          <div className="flex flex-col gap-2">
            {COMPLETION_ITEMS.map(({ label, pct, check }) => {
              const done = check(form);
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {done
                      ? <CheckCircle2 size={13} className="text-accent-secondary shrink-0" />
                      : <Circle size={13} className="text-text-tertiary shrink-0" />
                    }
                    <span className={`text-[12px] ${done ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                      {label}
                    </span>
                  </div>
                  {!done && <span className="text-[10px] font-semibold text-accent-secondary">+{pct}%</span>}
                </div>
              );
            })}
          </div>
        </aside>

      </div>
    </div>
  );
};

export default UserProfile;

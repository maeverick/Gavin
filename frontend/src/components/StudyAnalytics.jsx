import { useState, useEffect } from 'react';
import {
  BarChart2, Loader2, TrendingUp, TrendingDown, Flame,
  BookOpen, Calendar, Target, Award, AlertCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { fetchAnalyticsData, computeAnalytics } from '../lib/analytics';

const MOTIVATIONAL_QUOTES = [
  '"Consistency is the companion of excellence." — Nigerian Supreme Court Precedent',
  '"The law is not a light for you or any man to see by; the law is not an instrument of any kind." — Niki Tobi, JSC',
  '"Diligence is the mother of good fortune." — Legal Maxim',
  '"Study, study, and study again." — Nigerian Bar Association',
];

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, trend, trendLabel }) => (
  <div className="bg-bg-secondary border border-border rounded-2xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-text-secondary font-medium">{label}</span>
      <Icon size={16} className="text-text-tertiary" />
    </div>
    <p className="font-display text-[32px] font-bold text-text-primary leading-none">{value}</p>
    <div className="flex items-center gap-1.5">
      {trend !== undefined && trend !== null && (
        <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${trend >= 0 ? 'text-accent-secondary' : 'text-error'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
      {sub && <span className="text-[12px] text-text-tertiary">{sub}</span>}
      {trendLabel && !sub && <span className="text-[12px] text-text-tertiary">{trendLabel}</span>}
    </div>
  </div>
);

// ─── Custom Tooltip for recharts ───────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-3 py-2 text-[12px] shadow-lg">
      <p className="text-text-tertiary mb-0.5">{label}</p>
      <p className="font-semibold text-accent-primary">{payload[0].value}%</p>
    </div>
  );
};

// ─── Performance Trends ────────────────────────────────────────────────────────
const PerformanceTrends = ({ data }) => {
  const [period, setPeriod] = useState('monthly');
  const filteredData = period === 'weekly' ? data.slice(-4) : data;

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col items-center justify-center h-[300px]">
        <BarChart2 size={32} className="text-text-tertiary mb-3" />
        <p className="text-[13px] text-text-secondary">Complete some quizzes to see your performance trend.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">Performance Trends</h3>
          <p className="text-[12px] text-text-secondary mt-0.5">Aggregate score progression over the last 30 days</p>
        </div>
        <div className="flex gap-1.5">
          {['weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-all ${
                period === p
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #2a2a2a)" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary, #888)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary, #888)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5}
              fill="url(#scoreGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Subject Proficiency ───────────────────────────────────────────────────────
const SubjectProficiency = ({ data }) => (
  <div className="bg-bg-secondary border border-border rounded-2xl p-6">
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-[15px] font-semibold text-text-primary">Subject Proficiency</h3>
      {data.length > 0 && (
        <span className="text-[11px] font-semibold text-accent-primary uppercase tracking-wide">
          {data.length} subject{data.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>

    {data.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-[160px]">
        <BookOpen size={28} className="text-text-tertiary mb-2" />
        <p className="text-[13px] text-text-secondary">Take quizzes to track subject proficiency.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {data.map(({ subject, score, total }) => (
          <div key={subject}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-text-primary truncate pr-4">{subject}</span>
              <span className={`text-[13px] font-bold shrink-0 ${
                score >= 80 ? 'text-accent-secondary' : score >= 60 ? 'text-orange-400' : 'text-error'
              }`}>{score}%</span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  score >= 80 ? 'bg-accent-secondary' : score >= 60 ? 'bg-orange-400' : 'bg-error'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Study Consistency Calendar ────────────────────────────────────────────────
const StudyConsistency = ({ data }) => {
  const { month, firstDay, daysInMonth, todayNum, studiedDays } = data;
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const quote = MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length];

  // Build calendar grid with leading empty cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-text-primary">Study Consistency</h3>
        <span className="text-[12px] text-text-tertiary">{month}</span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-text-tertiary py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1 flex-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === todayNum;
          const studied = studiedDays.has(day);
          const isFuture = day > todayNum;

          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all ${
                isToday
                  ? 'border-2 border-accent-primary text-accent-primary font-bold'
                  : studied
                    ? 'bg-accent-secondary/20 text-accent-secondary'
                    : isFuture
                      ? 'text-text-tertiary opacity-30'
                      : 'text-text-tertiary'
              }`}>
                {studied && !isToday
                  ? <span className="text-[10px]">✓</span>
                  : day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quote */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-[11px] text-text-tertiary italic leading-relaxed">{quote}</p>
      </div>
    </div>
  );
};

// ─── Exam Readiness Predictor ─────────────────────────────────────────────────
const ExamReadiness = ({ data, plan }) => {
  const { current, projected, improvementPerWeek, status, statusColor, weeksRemaining } = data;
  const barWidth = Math.min(100, projected);

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">Exam Readiness</h3>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Projected score at exam date · {weeksRemaining} weeks away
          </p>
        </div>
        <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${
          projected >= 75 ? 'bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary'
          : projected >= 65 ? 'bg-blue-400/10 border-blue-400/20 text-blue-400'
          : projected >= 55 ? 'bg-orange-400/10 border-orange-400/20 text-orange-400'
          : 'bg-error/10 border-error/20 text-error'
        }`}>{status}</span>
      </div>

      {/* Current vs Projected */}
      <div className="flex items-end gap-6 mb-5">
        <div>
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1">Current</p>
          <p className="font-display text-[36px] font-bold text-text-primary leading-none">{current}%</p>
        </div>
        <div className="flex items-center gap-2 mb-2 text-text-tertiary">
          <div className="h-px w-8 bg-border" />
          <span className="text-[11px]">→</span>
        </div>
        <div>
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1">Projected</p>
          <p className={`font-display text-[36px] font-bold leading-none ${statusColor}`}>{projected}%</p>
        </div>
        <div className="flex-1" />
        <div className="text-right mb-1">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1">Weekly gain</p>
          <p className={`text-[18px] font-bold ${improvementPerWeek >= 0 ? 'text-accent-secondary' : 'text-error'}`}>
            {improvementPerWeek >= 0 ? '+' : ''}{improvementPerWeek}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-bg-tertiary rounded-full overflow-hidden mb-3">
        {/* 70% pass mark line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10" style={{ left: '70%' }} />
        <div className={`h-full rounded-full transition-all duration-700 ${
          projected >= 75 ? 'bg-accent-secondary' : projected >= 65 ? 'bg-blue-400' : projected >= 55 ? 'bg-orange-400' : 'bg-error'
        }`} style={{ width: `${barWidth}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-text-tertiary">
        <span>0%</span>
        <span className="text-white/40">70% pass mark</span>
        <span>100%</span>
      </div>

      {projected < 70 && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-orange-400/5 border border-orange-400/20 rounded-xl">
          <AlertCircle size={13} className="text-orange-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-text-secondary leading-relaxed">
            At your current pace you're projected to score <strong>{projected}%</strong> — below the 70% pass mark.
            Increase quiz frequency and focus on weak subjects to close the gap.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Topic Mastery Heatmap ─────────────────────────────────────────────────────
const TopicMastery = ({ data }) => {
  const [expanded, setExpanded] = useState(data[0]?.subject || null);

  if (data.length === 0) return null;

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-6">
      <h3 className="text-[15px] font-semibold text-text-primary mb-4">Topic Mastery</h3>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {data.map(({ subject }) => (
          <button key={subject} onClick={() => setExpanded(subject)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
              expanded === subject
                ? 'bg-text-primary text-bg-primary border-text-primary'
                : 'border-border text-text-secondary hover:border-accent-primary/40 hover:text-text-primary'
            }`}>
            {subject}
          </button>
        ))}
      </div>

      {/* Topics for selected subject */}
      {data.filter(s => s.subject === expanded).map(({ subject, topics }) => (
        <div key={subject} className="flex flex-col gap-2.5">
          {topics.map(({ topic, correct, total, pct }) => (
            <div key={topic}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-text-primary truncate pr-4 max-w-[70%]">{topic}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-text-tertiary">{correct}/{total}</span>
                  <span className={`text-[12px] font-bold w-10 text-right ${
                    pct >= 80 ? 'text-accent-secondary' : pct >= 60 ? 'text-orange-400' : 'text-error'
                  }`}>{pct}%</span>
                  {pct < 60 && <AlertCircle size={11} className="text-error" />}
                </div>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 80 ? 'bg-accent-secondary' : pct >= 60 ? 'bg-orange-400' : 'bg-error'
                }`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      ))}

      <p className="text-[11px] text-text-tertiary mt-4">Topics sorted weakest → strongest. Red = below 60%, needs focus.</p>
    </div>
  );
};

// ─── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full px-8 text-center">
    <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-5">
      <BarChart2 size={28} />
    </div>
    <h2 className="font-display text-2xl text-text-primary mb-3">No data yet</h2>
    <p className="text-text-secondary text-[14px] max-w-sm leading-relaxed">
      Complete some quizzes or study planner tasks and your analytics will appear here automatically.
    </p>
  </div>
);

// ─── Root ──────────────────────────────────────────────────────────────────────
const StudyAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalyticsData().then(({ quizzes, completedTasks, plan }) => {
      setAnalytics(computeAnalytics(quizzes, completedTasks, plan));
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="h-[70px] border-b border-border flex items-center px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <BarChart2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Study Analytics</h2>
            <p className="text-[10px] text-text-tertiary">
              {analytics?.plan
                ? `${analytics.plan.exam_type} · ${analytics.daysToExam ?? '—'} days to exam`
                : 'Your performance at a glance'}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-text-tertiary" />
        </div>
      ) : !analytics?.hasData ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Target}
                label="Accuracy Rate"
                value={`${analytics.accuracyRate}%`}
                trend={analytics.accuracyTrend}
                trendLabel="from last week"
              />
              <StatCard
                icon={Flame}
                label="Daily Streak"
                value={`${analytics.streak} ${analytics.streak === 1 ? 'Day' : 'Days'}`}
                sub={analytics.streak >= 7 ? 'Keep it up!' : analytics.streak > 0 ? 'Great start' : 'Start today'}
              />
              <StatCard
                icon={BookOpen}
                label="Questions Solved"
                value={analytics.questionsSolved.toLocaleString()}
                sub="total answered"
              />
              {analytics.daysToExam !== null ? (
                <StatCard
                  icon={Calendar}
                  label={`Days to ${analytics.plan?.exam_type || 'Exam'}`}
                  value={analytics.daysToExam}
                  sub={analytics.daysToExam <= 14 ? 'Final stretch!' : analytics.daysToExam <= 30 ? 'Intensify now' : 'Stay consistent'}
                />
              ) : (
                <StatCard
                  icon={Award}
                  label="Quizzes Taken"
                  value={analytics.weeklyTrend.length > 0 ? analytics.weeklyTrend.length : '—'}
                  sub="weeks of data"
                />
              )}
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
              <div className="lg:col-span-2">
                <PerformanceTrends data={analytics.weeklyTrend} />
              </div>
              <SubjectProficiency data={analytics.subjectProficiency} />
            </div>

            {/* ── Exam readiness + Topic mastery ── */}
            {(analytics.examReadiness || analytics.topicMastery?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {analytics.examReadiness && (
                  <ExamReadiness data={analytics.examReadiness} plan={analytics.plan} />
                )}
                {analytics.topicMastery?.length > 0 && (
                  <TopicMastery data={analytics.topicMastery} />
                )}
              </div>
            )}

            {/* ── Bottom row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <StudyConsistency data={analytics.studyConsistency} />

              {/* Quick insights */}
              <div className="bg-bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-[15px] font-semibold text-text-primary mb-4">Quick Insights</h3>
                <div className="flex flex-col gap-3">
                  {analytics.accuracyRate >= 80 && (
                    <div className="flex items-start gap-3 p-3 bg-accent-secondary/10 border border-accent-secondary/20 rounded-xl">
                      <span className="text-accent-secondary text-[18px] mt-0.5">✓</span>
                      <p className="text-[13px] text-text-primary leading-relaxed">Strong accuracy at {analytics.accuracyRate}% — you're above the bar exam pass threshold.</p>
                    </div>
                  )}
                  {analytics.accuracyRate > 0 && analytics.accuracyRate < 60 && (
                    <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/20 rounded-xl">
                      <span className="text-error text-[18px] mt-0.5">!</span>
                      <p className="text-[13px] text-text-primary leading-relaxed">Accuracy below 60% — increase quiz frequency and review explanations carefully.</p>
                    </div>
                  )}
                  {analytics.streak >= 7 && (
                    <div className="flex items-start gap-3 p-3 bg-orange-400/10 border border-orange-400/20 rounded-xl">
                      <Flame size={18} className="text-orange-400 mt-0.5 shrink-0" />
                      <p className="text-[13px] text-text-primary leading-relaxed">{analytics.streak}-day study streak — exceptional discipline. Keep the momentum.</p>
                    </div>
                  )}
                  {analytics.subjectProficiency.find(s => s.score < 60) && (
                    <div className="flex items-start gap-3 p-3 bg-bg-tertiary border border-border rounded-xl">
                      <span className="text-text-tertiary text-[18px] mt-0.5">↑</span>
                      <p className="text-[13px] text-text-primary leading-relaxed">
                        Focus on <strong>{analytics.subjectProficiency.find(s => s.score < 60)?.subject}</strong> — your weakest subject. Generate a targeted quiz.
                      </p>
                    </div>
                  )}
                  {analytics.daysToExam !== null && analytics.daysToExam <= 30 && (
                    <div className="flex items-start gap-3 p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl">
                      <Calendar size={18} className="text-accent-primary mt-0.5 shrink-0" />
                      <p className="text-[13px] text-text-primary leading-relaxed">
                        {analytics.daysToExam} days to {analytics.plan?.exam_type}. Shift to daily practice and timed sessions now.
                      </p>
                    </div>
                  )}
                  {analytics.questionsSolved === 0 && (
                    <p className="text-[13px] text-text-secondary">Take your first quiz to unlock personalized insights.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StudyAnalytics;

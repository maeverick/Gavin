import { supabase } from './supabase';
import { getEffectiveUserId } from './sessions';

// ─── Supabase fetchers ─────────────────────────────────────────────────────────

export const fetchAnalyticsData = async () => {
  const userId = await getEffectiveUserId();

  const [{ data: quizzes }, { data: tasks }, { data: plan }] = await Promise.all([
    supabase.from('quizzes').select('*').eq('user_id', userId),
    supabase.from('plan_tasks').select('*').eq('user_id', userId).eq('completed', true),
    supabase.from('study_plans').select('exam_date, exam_type, subjects')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    quizzes: quizzes || [],
    completedTasks: tasks || [],
    plan: plan || null,
  };
};

// ─── Computation helpers ───────────────────────────────────────────────────────

const isoDate = (d) => new Date(d).toISOString().split('T')[0];

const getWeekLabel = (dateStr) => {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `WK ${String(week).padStart(2, '0')}`;
};

export const computeAnalytics = (quizzes, completedTasks, plan) => {
  // Flatten all attempts
  const allAttempts = quizzes.flatMap(q =>
    (q.attempts || []).map(a => ({ ...a, quizTopic: q.topic || 'General' }))
  );

  // ── Accuracy rate ──
  const totalScore = allAttempts.reduce((s, a) => s + (a.score || 0), 0);
  const totalPossible = allAttempts.reduce((s, a) => s + (a.total || 0), 0);
  const accuracyRate = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  // Compare this week vs last week for the trend indicator
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const thisWeekAttempts = allAttempts.filter(a => now - new Date(a.date) < weekMs);
  const lastWeekAttempts = allAttempts.filter(a => {
    const diff = now - new Date(a.date);
    return diff >= weekMs && diff < 2 * weekMs;
  });
  const thisWeekPct = thisWeekAttempts.length
    ? Math.round(thisWeekAttempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / thisWeekAttempts.length)
    : null;
  const lastWeekPct = lastWeekAttempts.length
    ? Math.round(lastWeekAttempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / lastWeekAttempts.length)
    : null;
  const accuracyTrend = thisWeekPct !== null && lastWeekPct !== null ? thisWeekPct - lastWeekPct : null;

  // ── Questions solved ──
  const questionsSolved = totalPossible;

  // ── Daily streak from completed plan tasks ──
  const studyDaySet = new Set(
    completedTasks.map(t => t.completed_at ? isoDate(t.completed_at) : null).filter(Boolean)
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (studyDaySet.has(isoDate(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // ── Days to exam ──
  const daysToExam = plan?.exam_date
    ? Math.max(0, Math.ceil((new Date(plan.exam_date) - Date.now()) / 86400000))
    : null;

  // ── Weekly performance trend (last 8 weeks) ──
  const weekMap = {};
  allAttempts.forEach(a => {
    if (!a.date) return;
    const label = getWeekLabel(a.date);
    if (!weekMap[label]) weekMap[label] = { score: 0, count: 0 };
    weekMap[label].score += (a.score / a.total) * 100;
    weekMap[label].count++;
  });
  const weeklyTrend = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, data]) => ({ week, score: Math.round(data.score / data.count) }));

  // ── Subject proficiency ──
  const subjectMap = {};
  allAttempts.forEach(a => {
    const subject = a.quizTopic;
    if (!subjectMap[subject]) subjectMap[subject] = { correct: 0, total: 0 };
    subjectMap[subject].correct += a.score || 0;
    subjectMap[subject].total += a.total || 0;
  });
  const subjectProficiency = Object.entries(subjectMap)
    .filter(([, d]) => d.total > 0)
    .map(([subject, d]) => ({ subject, score: Math.round((d.correct / d.total) * 100), total: d.total }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  // ── Study consistency — current month calendar ──
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();
  const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
  const firstDay = new Date(thisYear, thisMonth, 1).getDay(); // 0=Sun

  const studyConsistency = {
    month: today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    firstDay,
    daysInMonth,
    todayNum: today.getDate(),
    studiedDays: new Set(
      completedTasks
        .map(t => {
          if (!t.completed_at) return null;
          const d = new Date(t.completed_at);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear ? d.getDate() : null;
        })
        .filter(Boolean)
    ),
  };

  // ── Exam readiness predictor ──
  let examReadiness = null;
  if (daysToExam !== null && weeklyTrend.length >= 2) {
    const scores = weeklyTrend.map(w => w.score);
    // Linear improvement rate: (last - first) / (n-1) weeks
    const improvementPerWeek = (scores[scores.length - 1] - scores[0]) / (scores.length - 1);
    const weeksRemaining = daysToExam / 7;
    const projected = Math.min(100, Math.max(0, Math.round(accuracyRate + improvementPerWeek * weeksRemaining)));
    const status = projected >= 75 ? 'Ready'
      : projected >= 65 ? 'Nearly Ready'
      : projected >= 55 ? 'Moderate Risk'
      : 'High Risk';
    const statusColor = projected >= 75 ? 'text-accent-secondary'
      : projected >= 65 ? 'text-blue-400'
      : projected >= 55 ? 'text-orange-400'
      : 'text-error';
    examReadiness = { current: accuracyRate, projected, improvementPerWeek: Math.round(improvementPerWeek * 10) / 10, status, statusColor, weeksRemaining: Math.round(weeksRemaining) };
  }

  // ── Topic mastery heatmap ──
  // Aggregate topic_breakdown from every quiz attempt
  const topicMap = {}; // { subject: { topic: { correct, total } } }
  quizzes.forEach(q => {
    (q.attempts || []).forEach(a => {
      if (!a.topic_breakdown) return;
      Object.entries(a.topic_breakdown).forEach(([topic, data]) => {
        const subject = q.topic || 'General';
        if (!topicMap[subject]) topicMap[subject] = {};
        if (!topicMap[subject][topic]) topicMap[subject][topic] = { correct: 0, total: 0 };
        topicMap[subject][topic].correct += data.correct || 0;
        topicMap[subject][topic].total   += data.total   || 0;
      });
    });
  });
  const topicMastery = Object.entries(topicMap)
    .map(([subject, topics]) => ({
      subject,
      topics: Object.entries(topics)
        .filter(([, d]) => d.total > 0)
        .map(([topic, d]) => ({ topic, correct: d.correct, total: d.total, pct: Math.round((d.correct / d.total) * 100) }))
        .sort((a, b) => a.pct - b.pct), // weakest first
    }))
    .filter(s => s.topics.length > 0);

  return {
    accuracyRate,
    accuracyTrend,
    questionsSolved,
    streak,
    daysToExam,
    plan,
    weeklyTrend,
    subjectProficiency,
    studyConsistency,
    examReadiness,
    topicMastery,
    hasData: allAttempts.length > 0 || completedTasks.length > 0,
  };
};

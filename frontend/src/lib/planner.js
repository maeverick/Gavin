import { supabase } from './supabase';
import { getEffectiveUserId } from './sessions';

export const fetchActivePlan = async () => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('Failed to fetch plan:', error); return null; }
  if (!data) return null;
  // Normalize subjects — may be objects or JSON strings from older plans
  return {
    ...data,
    subjects: (data.subjects || []).map(s => {
      if (typeof s !== 'string') return s.title || String(s);
      try { const p = JSON.parse(s); return (typeof p === 'object' && p.title) ? p.title : s; }
      catch { return s; }
    }),
  };
};

export const savePlan = async (planData) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('study_plans')
    .insert({ ...planData, user_id: userId })
    .select()
    .single();
  if (error) { console.error('Failed to save plan:', error); return null; }
  return data;
};

export const deletePlan = async (planId) => {
  const userId = await getEffectiveUserId();
  await supabase.from('plan_tasks').delete().eq('plan_id', planId).eq('user_id', userId);
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);
  if (error) console.error('Failed to delete plan:', error);
};

export const fetchCompletedTasks = async (planId) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('completed', true);
  if (error) { console.error('Failed to fetch tasks:', error); return []; }
  return data;
};

export const toggleTask = async (planId, weekNumber, dayOfWeek, taskIndex, completed) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('plan_tasks')
    .upsert({
      user_id: userId,
      plan_id: planId,
      week_number: weekNumber,
      day_of_week: dayOfWeek,
      task_index: taskIndex,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,plan_id,week_number,day_of_week,task_index' });
  if (error) console.error('Failed to toggle task:', error);
};

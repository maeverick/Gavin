import { supabase } from './supabase';
import { getEffectiveUserId } from './sessions';

export const fetchQuizzes = async () => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Failed to fetch quizzes:', error); return []; }
  return data;
};

export const saveQuiz = async (quiz) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ ...quiz, user_id: userId })
    .select()
    .single();
  if (error) { console.error('Failed to save quiz:', error); return null; }
  return data;
};

export const saveAttempt = async (quizId, attempt) => {
  const userId = await getEffectiveUserId();
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('attempts')
    .eq('id', quizId)
    .eq('user_id', userId)
    .single();

  const attempts = [...(quiz?.attempts || []), attempt];
  const { error } = await supabase
    .from('quizzes')
    .update({ attempts })
    .eq('id', quizId)
    .eq('user_id', userId);
  if (error) console.error('Failed to save attempt:', error);
};

export const deleteQuiz = async (quizId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId)
    .eq('user_id', userId);
  if (error) console.error('Failed to delete quiz:', error);
};

export const shareQuiz = async (quizId) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('quizzes')
    .update({ is_public: true })
    .eq('id', quizId)
    .eq('user_id', userId)
    .select('share_id')
    .single();
  if (error) { console.error('Failed to share quiz:', error); return null; }
  return data.share_id;
};

export const unshareQuiz = async (quizId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('quizzes')
    .update({ is_public: false })
    .eq('id', quizId)
    .eq('user_id', userId);
  if (error) console.error('Failed to unshare quiz:', error);
};

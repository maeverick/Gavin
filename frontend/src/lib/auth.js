import { supabase } from './supabase';

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  // Reset to a fresh anon ID so data is isolated after logout
  localStorage.removeItem('gavin-anon-user-id');
  localStorage.removeItem('gavin-free-msgs');
};

export const migrateAnonData = async (authUserId) => {
  const anonId = localStorage.getItem('gavin-anon-user-id');
  if (!anonId || anonId === authUserId) {
    localStorage.setItem('gavin-anon-user-id', authUserId);
    return;
  }
  const tables = ['sessions', 'notes', 'decks', 'quizzes', 'study_plans', 'plan_tasks'];
  await Promise.all(
    tables.map(table =>
      supabase.from(table).update({ user_id: authUserId }).eq('user_id', anonId)
    )
  );
  localStorage.setItem('gavin-anon-user-id', authUserId);
};

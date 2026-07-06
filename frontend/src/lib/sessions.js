import { supabase } from './supabase';

const ANON_USER_KEY = 'gavin-anon-user-id';

export const getAnonUserId = () => {
  let id = localStorage.getItem(ANON_USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_USER_KEY, id);
  }
  return id;
};

export const getEffectiveUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? getAnonUserId();
};

export const fetchSessions = async (knownUserId = null) => {
  const userId = knownUserId || await getEffectiveUserId();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, preview, messages, summary, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    title: row.title,
    preview: row.preview,
    messages: row.messages,
    summary: row.summary || null,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
};

export const upsertSession = async (session) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('sessions')
    .upsert({
      id: session.id,
      user_id: userId,
      title: session.title,
      preview: session.preview,
      messages: session.messages,
      summary: session.summary || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to save session:', error);
  }
};

export const renameSession = async (sessionId, title) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to rename session:', error);
  }
};

export const deleteSession = async (sessionId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete session:', error);
  }
};

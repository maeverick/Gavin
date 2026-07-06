import { supabase } from './supabase';
import { getEffectiveUserId } from './sessions';

export const fetchNotes = async () => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.error('Failed to fetch notes:', error); return []; }
  return data;
};

export const saveNote = async (note) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...note, user_id: userId })
    .select()
    .single();

  if (error) { console.error('Failed to save note:', error); return null; }
  return data;
};

export const deleteNote = async (noteId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) console.error('Failed to delete note:', error);
};

export const updateNoteTitle = async (noteId, title) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('notes')
    .update({ title })
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) console.error('Failed to update note:', error);
};

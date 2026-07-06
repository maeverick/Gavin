import { supabase } from './supabase';

export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('Failed to fetch profile:', error); return null; }
  return data;
};

export const saveProfile = async (userId, profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { ...profile, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) { console.error('Failed to save profile:', error); return null; }
  return data;
};

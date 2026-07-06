import { supabase } from './supabase';
import { getEffectiveUserId } from './sessions';

export const fetchDecks = async () => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) { console.error('Failed to fetch decks:', error); return []; }
  return data;
};

export const saveDeck = async (deck) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('decks')
    .insert({ ...deck, user_id: userId })
    .select()
    .single();

  if (error) { console.error('Failed to save deck:', error); return null; }
  return data;
};

export const updateDeck = async (deckId, updates) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('decks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', deckId)
    .eq('user_id', userId);

  if (error) console.error('Failed to update deck:', error);
};

export const deleteDeck = async (deckId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', userId);

  if (error) console.error('Failed to delete deck:', error);
};

export const shareDeck = async (deckId) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('decks')
    .update({ is_public: true })
    .eq('id', deckId)
    .eq('user_id', userId)
    .select('share_id')
    .single();

  if (error) { console.error('Failed to share deck:', error); return null; }
  return data.share_id;
};

export const unshareDeck = async (deckId) => {
  const userId = await getEffectiveUserId();
  const { error } = await supabase
    .from('decks')
    .update({ is_public: false })
    .eq('id', deckId)
    .eq('user_id', userId);

  if (error) console.error('Failed to unshare deck:', error);
};

export const fetchSharedDeck = async (shareId) => {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .single();

  if (error) { console.error('Failed to fetch shared deck:', error); return null; }
  return data;
};

export const importDeck = async (sharedDeck) => {
  const userId = await getEffectiveUserId();
  const { data, error } = await supabase
    .from('decks')
    .insert({
      title: sharedDeck.title,
      description: sharedDeck.description,
      topic: sharedDeck.topic,
      cards: (sharedDeck.cards || []).map(c => ({
        ...c,
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        review_count: 0,
        last_interval_days: 1,
        next_review_date: null,
        last_rated: null,
        mastered: false,
      })),
      user_id: userId,
    })
    .select()
    .single();

  if (error) { console.error('Failed to import deck:', error); return null; }
  return data;
};

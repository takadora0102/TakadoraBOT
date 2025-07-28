// --- src/utils/db.js ---
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ---------- ギルドの入退室設定 ---------- */
export async function getGreeter(guildId) {
  const { data, error } = await supabase
    .from('guild_greeter_settings')
    .select('*')
    .eq('guild_id', guildId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function upsertGreeter(guildId, patch) {
  const payload = { guild_id: guildId, ...patch, updated_at: new Date() };
  const { error } = await supabase
    .from('guild_greeter_settings')
    .upsert(payload, { onConflict: 'guild_id' });
  if (error) throw error;
}

/* ---------- レベル機能設定 ---------- */
export async function getLevelSetting(guildId) {
  const { data, error } = await supabase
    .from('guild_level_settings')
    .select('*')
    .eq('guild_id', guildId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function upsertLevelSetting(guildId, patch) {
  const payload = { guild_id: guildId, ...patch, updated_at: new Date() };
  const { error } = await supabase
    .from('guild_level_settings')
    .upsert(payload, { onConflict: 'guild_id' });
  if (error) throw error;
}

/* ---------- XP 操作 ---------- */
export async function addXp(guildId, userId, delta = 10) {
  const { data, error } = await supabase.rpc('increment_xp', {
    arg_guild_id: guildId,
    arg_user_id: userId,
    arg_delta: delta
  }); // ★ SQL Function を後述
  if (error) throw error;
  return data.new_xp;          // 戻り値 → 新しい XP
}

export async function getXp(guildId, userId) {
  const { data, error } = await supabase
    .from('user_xp')
    .select('xp')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.xp ?? 0;
}

export async function getRank(guildId, limit = 10) {
  const { data, error } = await supabase
    .from('user_xp')
    .select('user_id, xp')
    .eq('guild_id', guildId)
    .order('xp', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

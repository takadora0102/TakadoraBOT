// --- src/utils/cooldown.js ---
const map = new Map();            // userId → lastTime(ms)

export function canGainXp(userId, cooldownMs = 60_000) {
  const now = Date.now();
  const last = map.get(userId) ?? 0;
  if (now - last < cooldownMs) return false;
  map.set(userId, now);
  return true;
}

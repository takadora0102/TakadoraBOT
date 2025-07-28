// --- src/utils/nickname.js ---
/**
 * メンバー一覧を走査して最大番号+1 を返す。
 * 番号フォーマット: "12 xxxx"
 */
export function nextNumber(members) {
  let max = 0;
  const re = /^(\d+)\s+/;
  members.forEach((m) => {
    const m2 = m.displayName.match(re);
    if (m2) max = Math.max(max, Number(m2[1]));
  });
  return max + 1;
}

import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import 'dotenv/config';
import express from 'express';
import { loadConfig } from './utils/configStore.js'; // ギルド設定(JSON)

// ── Discord Client ──────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once(Events.ClientReady, () =>
  console.log(`✅ Logged in as ${client.user.tag}`)
);

// ── プレースホルダー置換 ─────────────────────
function format(tpl, vars) {
  return tpl
    .replace('{user}', vars.user)
    .replace('{tag}', vars.tag)
    .replace('{rules}', vars.rules)
    .replace('{guild}', vars.guild)
    .replace('{memberCount}', String(vars.memberCount));
}

// ── JOIN ─────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return; // Bot は無視

  // 1) ギルド設定取得
  const cfg = (await loadConfig())[member.guild.id] ?? {};
  const channel =
    member.guild.channels.cache.get(cfg.channelId) ?? member.guild.systemChannel;
  if (!channel) return;

  // 2) 全メンバーを取得し、既存番号の最大値を計算
  await member.guild.members.fetch({ withPresences: false });
  const numberRegex = /^(\d+)\s+/;          // 先頭の整数と半角スペース
  let max = 0;

  member.guild.members.cache.forEach((m) => {
    const match = m.displayName.match(numberRegex);
    if (match) max = Math.max(max, Number(match[1]));
  });

  const newNumber = max + 1;

  // 3) ニックネームを「<番号> <元の名前>」に変更
  try {
    const base = member.displayName.replace(numberRegex, ''); // 旧番号除去
    await member.setNickname(`${newNumber} ${base}`);
  } catch (e) {
    console.warn('⚠️ nickname set failed:', e.code);
  }

  // 4) “人間だけ” のメンバー数を計算
  const humanCount = member.guild.members.cache.filter((m) => !m.user.bot).size;

  // 5) メッセージ送信
  const template =
    cfg.joinMessage ??
    '🎉 {user} さん、ようこそ {guild} へ！\n' +
    'まずは {rules} をご確認ください。\n' +
    '現在のメンバー数は {memberCount} 人です。楽しんでいってね！';

  channel.send(
    format(template, {
      user: `${member}`, // メンション
      tag: member.user.tag,
      rules: cfg.rulesChannelId ? `<#${cfg.rulesChannelId}>` : '',
      guild: member.guild.name,
      memberCount: humanCount,
    })
  );
});

// ── LEAVE ────────────────────────────────────
client.on(Events.GuildMemberRemove, async (member) => {
  if (member.user.bot) return;

  const cfg = (await loadConfig())[member.guild.id] ?? {};
  const channel =
    member.guild.channels.cache.get(cfg.channelId) ?? member.guild.systemChannel;
  if (!channel) return;

  await member.guild.members.fetch({ withPresences: false });
  const humanCount = member.guild.members.cache.filter((m) => !m.user.bot).size;

  const template =
    cfg.leaveMessage ??
    '👋 {user} さん（{tag}）が {guild} を退出しました。\n' +
    '現在のメンバー数は {memberCount} 人です。またいつでも遊びに来てください！';

  channel.send(
    format(template, {
      user: `${member.user}`, // 退出時は User オブジェクト
      tag: member.user.tag,
      rules: '',
      guild: member.guild.name,
      memberCount: humanCount,
    })
  );
});

// ── Render keep-alive ─────────────────────────
const app = express();
app.get('/', (_, res) => res.send('Bot is alive ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🌐 Express keep-alive on :${PORT}`)
);

// ── Login ────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);

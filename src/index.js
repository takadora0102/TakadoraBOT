// --- src/index.js ---
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
} from 'discord.js';
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getGreeter,
  getLevelSetting,
  addXp,
} from './utils/db.js';
import { DEFAULT_JOIN, DEFAULT_LEAVE } from './constants/messages.js';
import { nextNumber } from './utils/nickname.js';
import { canGainXp } from './utils/cooldown.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

/* ------- コマンドロード ------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmdPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdPath)) {
  const { data, execute } = await import(`./commands/${file}`);
  client.commands.set(data.name, { data, execute });
}

/* ------- Ready ------- */
client.once(Events.ClientReady, () =>
  console.log(`✅ Logged in as ${client.user.tag}`),
);

/* ------- InteractionCreate ------- */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (e) {
    console.error(e);
    if (interaction.deferred || interaction.replied) {
      interaction.editReply('❌ コマンド実行中にエラーが発生しました');
    } else {
      interaction.reply({ content: '❌ エラー', ephemeral: true });
    }
  }
});

/* ------- Join / Leave ------- */
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;

  const cfg = await getGreeter(member.guild.id);
  if (!cfg?.channel_id) return;
  const ch = member.guild.channels.cache.get(cfg.channel_id);
  if (!ch) return;

  // 番号付与
  await member.guild.members.fetch();
  const num = nextNumber(member.guild.members.cache.filter(m => !m.user.bot));
  try {
    const base = member.displayName.replace(/^\d+\s+/, '');
    await member.setNickname(`${num} ${base}`);
  } catch {}

  const msg = (cfg.join_message ?? DEFAULT_JOIN)
    .replace('{user}', `${member}`)
    .replace('{guild}', member.guild.name);
  ch.send(msg);
});

client.on(Events.GuildMemberRemove, async (member) => {
  if (member.user.bot) return;

  const cfg = await getGreeter(member.guild.id);
  if (!cfg?.channel_id) return;
  const ch = member.guild.channels.cache.get(cfg.channel_id);
  if (!ch) return;

  const msg = (cfg.leave_message ?? DEFAULT_LEAVE)
    .replace('{user}', `${member.user}`)
    .replace('{guild}', member.guild.name);
  ch.send(msg);
});

/* ------- XP 付与 ------- */
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  const lvlCfg = await getLevelSetting(msg.guild.id);
  if (!lvlCfg?.enabled) return;
  if (!canGainXp(msg.author.id)) return;

  const newXp = await addXp(msg.guild.id, msg.author.id, 10);
  const lvOld = Math.floor((newXp - 10) / 500);
  const lvNew = Math.floor(newXp / 500);
  if (lvNew > lvOld) {
    const ch = msg.guild.channels.cache.get(lvlCfg.notify_channel_id);
    if (ch) ch.send(`🎉 ${msg.author} が **Lv${lvNew}** に上がりました！`);
  }
});

/* ------- Express keep-alive ------- */
const app = express();
app.get('/', (_, res) => res.send('Bot is alive ✅'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🌐 Express keep-alive on :${PORT}`),
);

client.login(process.env.DISCORD_TOKEN);

// --- scripts/registerCommands.js ---
import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cmdPath = path.join(__dirname, '../commands');

const commands = [];
for (const file of fs.readdirSync(cmdPath)) {
  const { data } = await import(`../commands/${file}`);
  commands.push(data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
console.log('✅ Slash コマンドを登録しました');

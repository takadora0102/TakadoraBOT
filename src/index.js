import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers    // join/leave に必須
  ],
  partials: [Partials.GuildMember]     // キャッシュ外で抜ける場合に備え
});

// 準備完了
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// メンバー参加
client.on(Events.GuildMemberAdd, member => {
  const channel =
    member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID) ??
    member.guild.systemChannel;

  channel?.send(`🎉 ようこそ、${member} さん！`);
});

// メンバー退出
client.on(Events.GuildMemberRemove, member => {
  const channel =
    member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID) ??
    member.guild.systemChannel;

  channel?.send(`👋 ${member.user.tag} さんが退出しました。またいつでもどうぞ！`);
});

client.login(process.env.DISCORD_TOKEN);

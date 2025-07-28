// --- src/commands/inout.js ---
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import {
  getGreeter,
  upsertGreeter,
} from '../utils/db.js';
import { DEFAULT_JOIN, DEFAULT_LEAVE } from '../constants/messages.js';

export const data = new SlashCommandBuilder()
  .setName('inout')
  .setDescription('入退室チャンネル＆メッセージ設定')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  /* /inout setup */
  .addSubcommand(sc =>
    sc.setName('setup').setDescription('#参加ー離脱 を自動生成'))
  /* /inout join <text> */
  .addSubcommand(sc =>
    sc.setName('join')
      .setDescription('参加メッセージ設定')
      .addStringOption(o =>
        o.setName('text').setDescription('未入力でデフォルト').setRequired(false)))
  /* /inout leave <text> */
  .addSubcommand(sc =>
    sc.setName('leave')
      .setDescription('退出メッセージ設定')
      .addStringOption(o =>
        o.setName('text').setDescription('未入力でデフォルト').setRequired(false)))
  /* /inout show */
  .addSubcommand(sc =>
    sc.setName('show').setDescription('現在の設定表示'));

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const gid = interaction.guild.id;

  switch (interaction.options.getSubcommand()) {
    case 'setup': {
      // 既存 or 新規チャンネル
      let ch = interaction.guild.channels.cache.find(
        c => c.name === '参加ー離脱' && c.type === ChannelType.GuildText,
      );
      if (!ch) {
        ch = await interaction.guild.channels.create({
          name: '参加ー離脱',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: ['SendMessages'],
            },
          ],
        });
      }
      await upsertGreeter(gid, { channel_id: ch.id });
      return interaction.editReply(`✅ <#${ch.id}> を入退室チャンネルに設定しました`);
    }

    case 'join': {
      const txt = interaction.options.getString('text');
      await upsertGreeter(gid, { join_message: txt });
      return interaction.editReply(
        `✅ 参加メッセージを ${txt ? '保存しました' : 'デフォルトにリセットしました'}`,
      );
    }

    case 'leave': {
      const txt = interaction.options.getString('text');
      await upsertGreeter(gid, { leave_message: txt });
      return interaction.editReply(
        `✅ 退出メッセージを ${txt ? '保存しました' : 'デフォルトにリセットしました'}`,
      );
    }

    case 'show': {
      const cfg = await getGreeter(gid);
      if (!cfg)
        return interaction.editReply('⚠️ 設定がありません。`/inout setup` を先に実行してください');

      const embed = new EmbedBuilder()
        .setTitle('入退室設定')
        .addFields(
          { name: '送信CH', value: cfg.channel_id ? `<#${cfg.channel_id}>` : '未設定', inline: false },
          { name: 'Join', value: cfg.join_message ?? DEFAULT_JOIN, inline: false },
          { name: 'Leave', value: cfg.leave_message ?? DEFAULT_LEAVE, inline: false },
        )
        .setColor(0x00bfff);

      return interaction.editReply({ embeds: [embed] });
    }
  }
}

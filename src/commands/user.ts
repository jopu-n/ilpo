import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Provides information about the user."),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member;
    const joinedAt =
      member && typeof member === "object" && "joinedAt" in member
        ? (member as any).joinedAt
        : "Unknown";

    await interaction.reply(
      `This command was run by ${interaction.user.username}, who joined on ${joinedAt}.`
    );
  },
};

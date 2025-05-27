import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Näyttää käyttäjän tiedot"),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member;
    const joinedAt =
      member && typeof member === "object" && "joinedAt" in member
        ? (member as any).joinedAt
        : "Ei tietoo";

    await interaction.reply(
      `Tän komennon ajo ${interaction.user.username}, joka liitty ${joinedAt}.`
    );
  },
};

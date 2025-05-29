import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { MusicManager } from "../../managers/MusicManager";
import "../../types"; // Import types to get global declarations

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Soita biisi YouTubesta")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Biisin nimi tai YouTube URL")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const musicManager = new MusicManager(global.player);
    const member = interaction.member as GuildMember;
    const channel = member?.voice.channel;
    const query = interaction.options.getString("query", true);

    await interaction.deferReply();

    const result = await musicManager.handlePlay(
      interaction.guild!.id,
      channel,
      query,
      interaction.user,
      interaction.channel,
      interaction.guild?.members.me
    );

    if (result.success) {
      return interaction.followUp(result.message);
    } else {
      return interaction.followUp(result.message);
    }
  },
};

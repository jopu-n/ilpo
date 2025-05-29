import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../../managers/MusicManager";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pysäytä nykynen biisi"),
  async execute(interaction: ChatInputCommandInteraction) {
    const musicManager = new MusicManager(global.player);

    const result = await musicManager.pause(interaction.guild!.id);

    if (result.success) {
      return interaction.reply(result.message);
    } else {
      return interaction.reply(result.message);
    }
  },
};

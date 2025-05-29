import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../../managers/MusicManager";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Näytä mikä biisi soi nyt"),
  async execute(interaction: ChatInputCommandInteraction) {
    const musicManager = new MusicManager(global.player);

    const result = musicManager.getNowPlayingEmbed(interaction.guild!.id);

    if (result.success) {
      return interaction.reply({ embeds: [result.embed!] });
    } else {
      return interaction.reply(result.message!);
    }
  },
};

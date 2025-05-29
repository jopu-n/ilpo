import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../../managers/MusicManager";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Näytä musiikkijono")
    .addIntegerOption((option) =>
      option.setName("page").setDescription("Sivunumero").setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const musicManager = new MusicManager(global.player);
    const page = interaction.options.getInteger("page") ?? 1;

    const result = musicManager.getQueueEmbed(interaction.guild!.id, page);

    if (result.success) {
      return interaction.reply({ embeds: [result.embed!] });
    } else {
      return interaction.reply(result.message!);
    }
  },
};

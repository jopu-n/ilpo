import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { MusicManager } from "../../managers/MusicManager";
import "../../types"; // Import types to get global declarations

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Muuta tai tarkista äänenvoimakkuus")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Äänenvoimakkuustaso (0-100)")
        .setMinValue(0)
        .setMaxValue(100)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const musicManager = new MusicManager(global.player);
    const volume = interaction.options.getInteger("level");

    const result = await musicManager.volume(
      interaction.guild!.id,
      volume || undefined
    );

    if (result.success) {
      return interaction.reply(result.message);
    } else {
      return interaction.reply(result.message);
    }
  },
};

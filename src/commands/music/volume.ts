import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

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
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    const volume = interaction.options.getInteger("level");

    if (volume === null) {
      return interaction.reply(`Äänenvoimakkuus o nyt ${queue.node.volume}%`);
    }

    queue.node.setVolume(volume);
    return interaction.reply(`Äänenvoimakkuus pistetty ${volume} prossaan!`);
  },
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Change or check the music volume")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume level (0-100)")
        .setMinValue(0)
        .setMaxValue(100)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("❌ No music is currently being played!");
    }

    const volume = interaction.options.getInteger("level");

    if (volume === null) {
      return interaction.reply(
        `🔊 Current volume is **${queue.node.volume}%**`
      );
    }

    queue.node.setVolume(volume);
    return interaction.reply(`🔊 Volume set to **${volume}%**!`);
  },
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("❌ No music is currently being played!");
    }

    if (queue.node.isPaused()) {
      return interaction.reply("⏸️ The music is already paused!");
    }

    queue.node.pause();
    return interaction.reply("⏸️ Paused the music!");
  },
};

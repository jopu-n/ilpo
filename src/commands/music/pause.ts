import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pysäytä nykynen biisi"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    if (queue.node.isPaused()) {
      return interaction.reply("Musiikki o jo pysäytettynä!");
    }

    queue.node.pause();
    return interaction.reply("Musiikki pysäytettii!");
  },
};

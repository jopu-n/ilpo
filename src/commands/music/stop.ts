import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Lopeta musiikki ja tyhjennä jono"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    queue.delete();
    return interaction.reply("Musiikki lopetettii ja jono tyhjennettii!");
  },
};

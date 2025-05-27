import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Jatka pysäytettyy musiikkii"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    if (!queue.node.isPaused()) {
      return interaction.reply("Musiikki ei oo pysäytettynä!");
    }

    queue.node.resume();
    return interaction.reply("Ja hyvät herrat musiikki jatkuu mar!");
  },
};

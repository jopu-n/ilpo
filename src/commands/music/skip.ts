import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Hyppää nykysen biisin yli"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();

    return interaction.reply(`Biisi ${currentTrack.title} ohitettii!`);
  },
};

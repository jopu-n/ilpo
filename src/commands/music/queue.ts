import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Näytä musiikkijono")
    .addIntegerOption((option) =>
      option.setName("page").setDescription("Sivunumero").setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    const totalPages = Math.ceil(queue.tracks.data.length / 10) || 1;
    const page = (interaction.options.getInteger("page") ?? 1) - 1;

    if (page > totalPages) {
      return interaction.reply(`Väärä sivu. Sivui o vaa ${totalPages}.`);
    }

    const queueString = queue.tracks.data
      .slice(page * 10, page * 10 + 10)
      .map((song, i) => {
        return `**${page * 10 + i + 1}.** \`[${song.duration}]\` ${
          song.title
        } -- <@${song.requestedBy!.id}>`;
      })
      .join("\n");

    const currentTrack = queue.currentTrack;

    const embed = new EmbedBuilder()
      .setDescription(
        `**Nyt soimassa**\n` +
          (currentTrack
            ? `\`[${currentTrack.duration}]\` ${currentTrack.title} -- <@${
                currentTrack.requestedBy!.id
              }>`
            : "Ei mitää") +
          `\n\n**Jono**\n${queueString}`
      )
      .setColor("#FF0000")
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({
        text: `Sivu ${page + 1}/${totalPages} | ${
          queue.tracks.data.length
        } biisii jonos | ${queue.estimatedDuration} kokonaiskesto`,
      });

    return interaction.reply({ embeds: [embed] });
  },
};

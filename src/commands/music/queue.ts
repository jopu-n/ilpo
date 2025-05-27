import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Display the music queue")
    .addIntegerOption((option) =>
      option.setName("page").setDescription("Queue page number").setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("❌ No music is currently being played!");
    }

    const totalPages = Math.ceil(queue.tracks.data.length / 10) || 1;
    const page = (interaction.options.getInteger("page") ?? 1) - 1;

    if (page > totalPages) {
      return interaction.reply(
        `❌ Invalid page. There are only ${totalPages} pages available.`
      );
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
        `**Currently Playing**\n` +
          (currentTrack
            ? `\`[${currentTrack.duration}]\` ${currentTrack.title} -- <@${
                currentTrack.requestedBy!.id
              }>`
            : "None") +
          `\n\n**Queue**\n${queueString}`
      )
      .setColor("#FF0000")
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({
        text: `Page ${page + 1} of ${totalPages} | ${
          queue.tracks.data.length
        } song(s) in queue | ${queue.estimatedDuration} total length`,
      });

    return interaction.reply({ embeds: [embed] });
  },
};

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Näytä mikä biisi soi nyt"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("Ei ol mittä musiikki soimas!");
    }

    const track = queue.currentTrack;
    const timestamp = queue.node.getTimestamp();
    const trackDuration =
      !timestamp || timestamp.progress === Infinity
        ? "loputtomii (live)"
        : track.duration;

    const embed = new EmbedBuilder()
      .setTitle("Nyt soimassa")
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: "Artisti", value: track.author, inline: true },
        { name: "Kesto", value: trackDuration, inline: true },
        {
          name: "Edistyminen",
          value:
            !timestamp || timestamp.progress === Infinity
              ? "loputtomii (live)"
              : `${timestamp.current.label} / ${timestamp.total.label}`,
          inline: true,
        },
        {
          name: "Äänenvoimakkuus",
          value: `${queue.node.volume}%`,
          inline: true,
        },
        {
          name: "Toisto",
          value: queue.repeatMode
            ? queue.repeatMode === 2
              ? "Jono"
              : "Kappale"
            : "Pois",
          inline: true,
        },
        { name: "Pyysi", value: `${track.requestedBy}`, inline: true }
      )
      .setThumbnail(track.thumbnail)
      .setColor("#FF0000");

    return interaction.reply({ embeds: [embed] });
  },
};

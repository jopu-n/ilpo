import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Display the currently playing song"),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = useQueue(interaction.guild!.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply("❌ No music is currently being played!");
    }

    const track = queue.currentTrack;
    const timestamp = queue.node.getTimestamp();
    const trackDuration =
      !timestamp || timestamp.progress === Infinity
        ? "infinity (live)"
        : track.duration;

    const embed = new EmbedBuilder()
      .setTitle("🎵 Now Playing")
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: "👤 Author", value: track.author, inline: true },
        { name: "⏱️ Duration", value: trackDuration, inline: true },
        {
          name: "📊 Progress",
          value:
            !timestamp || timestamp.progress === Infinity
              ? "infinity (live)"
              : `${timestamp.current.label} / ${timestamp.total.label}`,
          inline: true,
        },
        { name: "🔊 Volume", value: `${queue.node.volume}%`, inline: true },
        {
          name: "🔁 Loop",
          value: queue.repeatMode
            ? queue.repeatMode === 2
              ? "Queue"
              : "Track"
            : "Off",
          inline: true,
        },
        { name: "🎧 Requested by", value: `${track.requestedBy}`, inline: true }
      )
      .setThumbnail(track.thumbnail)
      .setColor("#FF0000");

    return interaction.reply({ embeds: [embed] });
  },
};

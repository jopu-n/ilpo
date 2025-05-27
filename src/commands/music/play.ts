import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song name or YouTube URL")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const player = global.player;
    const channel = (interaction.member as GuildMember)?.voice.channel;

    if (!channel) {
      return interaction.reply(
        "❌ You need to be in a voice channel to play music!"
      );
    }

    const query = interaction.options.getString("query", true);

    await interaction.deferReply();

    try {
      const { track } = await player.play(channel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild?.members.me,
            requestedBy: interaction.user,
          },
        },
      });

      return interaction.followUp(
        `🎵 **${track.title}** has been added to the queue!`
      );
    } catch (error) {
      console.log(error);
      return interaction.followUp(
        "❌ Something went wrong while trying to play that song!"
      );
    }
  },
};

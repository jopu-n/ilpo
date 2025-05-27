import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Soita biisi YouTubesta")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Biisin nimi tai YouTube URL")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const player = global.player;
    const channel = (interaction.member as GuildMember)?.voice.channel;

    if (!channel) {
      return interaction.reply(
        "Pitää olla äänikanavas et voi soittaa musiikki mar!"
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

      return interaction.followUp(`Biisi ${track.title} laitettii jonoo!`);
    } catch (error) {
      console.log(error);
      return interaction.followUp(
        "Jotaki meni pielee ku mää yrittäsin soittaa tuon biisi!"
      );
    }
  },
};

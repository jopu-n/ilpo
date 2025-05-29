import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { MusicManager } from "../../managers/MusicManager";
import { AISongService } from "../../services/AISongService";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("randomsong")
    .setDescription("Pyydä AI:ta ehdottamaan satunnainen biisi")
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription(
          "Kuvaus haluamastasi biisistä (jätä tyhjäksi täysin satunnaiseen)"
        )
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const channel = member?.voice.channel;
    const description = interaction.options.getString("description");

    if (!channel) {
      return interaction.reply(
        "Pitää olla äänikanavas et voi käyttää tätä komentoo!"
      );
    }

    // Initialize services
    const musicManager = new MusicManager(global.player);
    let aiSongService: AISongService;

    try {
      aiSongService = new AISongService();
    } catch (error) {
      return interaction.reply(
        "AI-biisisuositukset ei oo käytössä! Tarkista että GEMINI_API_KEY o asetettu .env-tiedostoos."
      );
    }

    await interaction.deferReply();

    try {
      // Send initial message
      await interaction.editReply(
        description
          ? `🤖 AI miettii biisii kuvauksel "${description}"...`
          : "🤖 AI miettii täysin satunnaist biisii..."
      );

      // Generate song with AI
      const result = await aiSongService.generateSong(description || undefined);

      if (!result.success) {
        return interaction.editReply(
          `❌ AI-virhe: ${result.error || "Tuntematon virhe"}`
        );
      }

      const songName = result.songName!;

      // Update message
      await interaction.editReply(
        `🎵 AI ehdotti: **${songName}**\nHaetaa YouTubesta...`
      );

      // Play the suggested song
      const playResult = await musicManager.handlePlay(
        interaction.guild!.id,
        channel,
        songName,
        interaction.user,
        interaction.channel,
        interaction.guild?.members.me
      );

      if (playResult.success) {
        return interaction.editReply(
          `✅ AI ehdotti: **${songName}**\n${
            playResult.message || "Biisi soitetaa!"
          }`
        );
      } else {
        return interaction.editReply(
          `⚠️ AI ehdotti: **${songName}**\nMutta ${playResult.message}`
        );
      }
    } catch (error) {
      console.error("Random song slash command error:", error);
      return interaction.editReply(
        "❌ Jotaki meni pielee AI-biisisuosituksen kans!"
      );
    }
  },
};

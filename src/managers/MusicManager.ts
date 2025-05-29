import {
  Message,
  GuildMember,
  VoiceBasedChannel,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Player, useQueue } from "discord-player";

export interface MP3FileInfo {
  url: string;
  name: string;
}

export interface MusicResult {
  success: boolean;
  message: string;
  track?: any;
  error?: any;
}

export class MusicManager {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Check if user is in a voice channel
   */
  public checkVoiceChannel(
    member: GuildMember | null
  ): VoiceBasedChannel | null {
    return member?.voice.channel || null;
  }

  /**
   * Find audio file attachment in message
   */
  public findAudioInMessage(message: Message): MP3FileInfo | null {
    const audioAttachment = message.attachments.find(
      (attachment) =>
        attachment.name?.toLowerCase().endsWith(".mp3") ||
        attachment.name?.toLowerCase().endsWith(".wav") ||
        attachment.name?.toLowerCase().endsWith(".m4a") ||
        attachment.name?.toLowerCase().endsWith(".ogg") ||
        attachment.name?.toLowerCase().endsWith(".flac") ||
        attachment.contentType?.includes("audio/")
    );

    if (audioAttachment) {
      return {
        url: audioAttachment.url,
        name: audioAttachment.name || "Äänitiedosto",
      };
    }

    return null;
  }

  /**
   * Find audio file in referenced message (reply)
   */
  public async findAudioInReply(message: Message): Promise<MP3FileInfo | null> {
    if (!message.reference) return null;

    try {
      const referencedMessage = await message.fetchReference();
      return this.findAudioInMessage(referencedMessage);
    } catch (error) {
      console.log("Virhe hakiessa viestiä:", error);
      return null;
    }
  }

  /**
   * Play music - handles both YouTube and audio files
   */
  public async play(
    channel: VoiceBasedChannel,
    query: string,
    metadata: any,
    isAudioFile: boolean = false,
    audioFileName?: string
  ): Promise<MusicResult> {
    try {
      const { track } = await this.player.play(channel, query, {
        nodeOptions: {
          metadata: metadata,
        },
      });

      return {
        success: true,
        track: track,
        message: isAudioFile
          ? `Selvä! Äänitiedosto "${audioFileName}" laitettii jonoo!`
          : "",
      };
    } catch (error) {
      console.log("Soitto-virhe:", error);
      return {
        success: false,
        error: error,
        message: isAudioFile
          ? "Jotaki meni pielee ku yritettii soittaa tuo äänitiedosto!"
          : "Jotaki meni pielee ku yritettii soittaa tuo biisi!",
      };
    }
  }

  /**
   * Handle play command for both slash and prefix commands
   */
  public async handlePlay(
    guildId: string,
    channel: VoiceBasedChannel | null,
    query: string | null,
    requestedBy: any,
    replyChannel: any,
    guildMember: any,
    message?: Message
  ): Promise<MusicResult> {
    if (!channel) {
      return {
        success: false,
        message: "Pitää olla äänikanavas et voi soittaa musikkii!",
      };
    }

    const metadata = {
      channel: replyChannel,
      client: guildMember,
      requestedBy: requestedBy,
    };

    // Check for audio files if message is provided (prefix commands)
    if (message) {
      // Check for audio in current message
      let audioInfo = this.findAudioInMessage(message);

      // If no audio in current message, check reply
      if (!audioInfo) {
        audioInfo = await this.findAudioInReply(message);
      }

      // If audio found, play it
      if (audioInfo) {
        return await this.play(
          channel,
          audioInfo.url,
          metadata,
          true,
          audioInfo.name
        );
      }
    }

    // No audio file found, check for text query
    if (!query || query.trim() === "") {
      return {
        success: false,
        message:
          "Anna joku biisin nimi, YouTube-linkki, tai vastaa äänitiedostoo!",
      };
    }

    return await this.play(channel, query, metadata, false);
  }

  /**
   * Stop music and clear queue
   */
  public async stop(guildId: string): Promise<MusicResult> {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    queue.delete();
    return {
      success: true,
      message: "Musiikki lopetettii ja jono tyhjennettii!",
    };
  }

  /**
   * Pause current track
   */
  public async pause(guildId: string): Promise<MusicResult> {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    if (queue.node.isPaused()) {
      return {
        success: false,
        message: "Musiikki o jo pysäytettynä!",
      };
    }

    queue.node.pause();
    return {
      success: true,
      message: "Musiikki pysäytettii!",
    };
  }

  /**
   * Resume paused track
   */
  public async resume(guildId: string): Promise<MusicResult> {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    if (!queue.node.isPaused()) {
      return {
        success: false,
        message: "Musiikki ei oo pysäytettynä!",
      };
    }

    queue.node.resume();
    return {
      success: true,
      message: "Ja hyvät herrat musiikki jatkuu mar!",
    };
  }

  /**
   * Skip current track
   */
  public async skip(guildId: string): Promise<MusicResult> {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();

    return {
      success: true,
      message: `Biisi ${currentTrack.title} ohitettii!`,
    };
  }

  /**
   * Get or set volume
   */
  public async volume(
    guildId: string,
    newVolume?: number
  ): Promise<MusicResult> {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    if (newVolume === undefined) {
      return {
        success: true,
        message: `Äänenvoimakkuus o nyt ${queue.node.volume}%`,
      };
    }

    if (newVolume < 0 || newVolume > 100) {
      return {
        success: false,
        message: "Äänenvoimakkuuden pitää olla 0-100 väliltä!",
      };
    }

    queue.node.setVolume(newVolume);
    return {
      success: true,
      message: `Äänenvoimakkuus pistetty ${newVolume} prossaan!`,
    };
  }

  /**
   * Get queue embed
   */
  public getQueueEmbed(
    guildId: string,
    page: number = 1
  ): { success: boolean; embed?: EmbedBuilder; message?: string } {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
    }

    const totalPages = Math.ceil(queue.tracks.data.length / 10) || 1;
    const pageIndex = page - 1;

    if (pageIndex >= totalPages || pageIndex < 0) {
      return {
        success: false,
        message: `Väärä sivu. Sivui o vaa ${totalPages}.`,
      };
    }

    const queueString = queue.tracks.data
      .slice(pageIndex * 10, pageIndex * 10 + 10)
      .map((song, i) => {
        return `**${pageIndex * 10 + i + 1}.** \`[${song.duration}]\` ${
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
          `\n\n**Jono**\n${queueString || "Jono o tyhjä"}`
      )
      .setColor("#FF0000")
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({
        text: `Sivu ${page}/${totalPages} | ${queue.tracks.data.length} biisii jonos | ${queue.estimatedDuration} kokonaiskesto`,
      });

    return {
      success: true,
      embed: embed,
    };
  }

  /**
   * Get now playing embed
   */
  public getNowPlayingEmbed(guildId: string): {
    success: boolean;
    embed?: EmbedBuilder;
    message?: string;
  } {
    const queue = useQueue(guildId);

    if (!queue || !queue.currentTrack) {
      return {
        success: false,
        message: "Ei ol mittä musiikki soimas!",
      };
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

    return {
      success: true,
      embed: embed,
    };
  }
}

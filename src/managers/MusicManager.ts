import {
  Message,
  GuildMember,
  VoiceBasedChannel,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Player, useQueue } from "discord-player";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  VoiceConnection,
  AudioPlayer,
  entersState,
  VoiceConnectionDisconnectReason,
  StreamType,
} from "@discordjs/voice";

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

interface DirectAudioState {
  isPlaying: boolean;
  connection: VoiceConnection | null;
  player: AudioPlayer | null;
  currentTrack: {
    title: string;
    url: string;
    requestedBy: any;
  } | null;
  guildId: string | null;
}

export class MusicManager {
  private player: Player;
  private directAudioState: DirectAudioState;

  constructor(player: Player) {
    this.player = player;
    this.directAudioState = {
      isPlaying: false,
      connection: null,
      player: null,
      currentTrack: null,
      guildId: null,
    };
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
   * Check if URL is a direct audio file URL
   */
  private isDirectAudioURL(url: string): boolean {
    return (
      url.includes("cdn.discordapp.com") ||
      url.includes("media.discordapp.net") ||
      url.match(/\.(mp3|wav|m4a|ogg|flac)(\?|$)/i) !== null
    );
  }

  /**
   * Play direct audio file using @discordjs/voice with enhanced error handling
   */
  private async playDirectAudio(
    channel: VoiceBasedChannel,
    audioUrl: string,
    audioName: string,
    requestedBy: any,
    guildId: string
  ): Promise<MusicResult> {
    let connection: VoiceConnection | null = null;
    let audioPlayer: AudioPlayer | null = null;

    try {
      console.log(`[MP3] Attempting to play: ${audioName} from ${audioUrl}`);

      // Stop any existing discord-player queue first
      const existingQueue = useQueue(guildId);
      if (existingQueue && existingQueue.currentTrack) {
        console.log("[MP3] Stopping existing queue");
        existingQueue.delete();
      }

      // Validate channel permissions
      if (!channel.joinable) {
        return {
          success: false,
          message: "Ei oikeuksii liittyy äänikanavas!",
          error: "No permission to join voice channel",
        };
      }

      console.log(
        `[MP3] Creating voice connection to channel: ${channel.name}`
      );

      // Create voice connection with timeout
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      // Wait for connection to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Voice connection timeout"));
        }, 10000); // 10 second timeout

        connection!.on(VoiceConnectionStatus.Ready, () => {
          console.log("[MP3] Voice connection ready");
          clearTimeout(timeout);
          resolve();
        });

        connection!.on(
          VoiceConnectionStatus.Disconnected,
          (oldState, newState) => {
            console.log(
              `[MP3] Voice connection disconnected: ${oldState.status} -> ${newState.status}`
            );
            clearTimeout(timeout);
            reject(
              new Error(
                `Voice connection disconnected: ${
                  newState.reason || "Unknown reason"
                }`
              )
            );
          }
        );

        connection!.on(VoiceConnectionStatus.Destroyed, () => {
          console.log("[MP3] Voice connection destroyed");
          clearTimeout(timeout);
          reject(new Error("Voice connection was destroyed"));
        });

        // Handle immediate ready state
        if (connection!.state.status === VoiceConnectionStatus.Ready) {
          console.log("[MP3] Voice connection was already ready");
          clearTimeout(timeout);
          resolve();
        }
      });

      console.log(`[MP3] Creating audio resource for: ${audioUrl}`);

      // Create audio player and resource with error handling
      audioPlayer = createAudioPlayer();
      let resource;

      try {
        resource = createAudioResource(audioUrl, {
          inputType: StreamType.Arbitrary,
          metadata: {
            title: audioName,
            url: audioUrl,
          },
        });
        console.log("[MP3] Audio resource created successfully");
      } catch (resourceError) {
        console.error("[MP3] Failed to create audio resource:", resourceError);
        throw new Error(
          `Failed to create audio resource: ${
            resourceError instanceof Error
              ? resourceError.message
              : "Unknown error"
          }`
        );
      }

      // Update state before starting playback
      this.directAudioState = {
        isPlaying: true,
        connection: connection,
        player: audioPlayer,
        currentTrack: {
          title: audioName,
          url: audioUrl,
          requestedBy: requestedBy,
        },
        guildId: guildId,
      };

      // Set up comprehensive event listeners
      audioPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log(`[MP3] Successfully started playing: ${audioName}`);
      });

      audioPlayer.on(AudioPlayerStatus.Idle, (oldState) => {
        console.log(
          `[MP3] Finished playing: ${audioName} (from ${oldState.status})`
        );
        this.cleanupDirectAudio();
      });

      audioPlayer.on(AudioPlayerStatus.Buffering, () => {
        console.log(`[MP3] Buffering: ${audioName}`);
      });

      audioPlayer.on("error", (error) => {
        console.error(`[MP3] Audio player error for ${audioName}:`, {
          message: error.message,
          stack: error.stack,
          resource: error.resource,
        });
        this.cleanupDirectAudio();
      });

      // Enhanced connection event handling
      connection.on(
        VoiceConnectionStatus.Disconnected,
        async (oldState, newState) => {
          console.log(
            `[MP3] Connection disconnected: ${oldState.status} -> ${newState.status}, reason: ${newState.reason}`
          );

          try {
            // Attempt to reconnect if it was a network issue
            if (
              newState.reason ===
                VoiceConnectionDisconnectReason.WebSocketClose &&
              newState.closeCode === 4014
            ) {
              console.log("[MP3] Attempting to reconnect...");
              await Promise.race([
                entersState(
                  connection!,
                  VoiceConnectionStatus.Signalling,
                  5_000
                ),
                entersState(
                  connection!,
                  VoiceConnectionStatus.Connecting,
                  5_000
                ),
              ]);
            } else {
              // Clean up if it's not a recoverable disconnect
              this.cleanupDirectAudio();
            }
          } catch (error) {
            console.log("[MP3] Failed to reconnect, cleaning up");
            this.cleanupDirectAudio();
          }
        }
      );

      connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log("[MP3] Voice connection destroyed");
        this.cleanupDirectAudio();
      });

      // Subscribe and start playing
      console.log("[MP3] Subscribing connection to audio player");
      const subscription = connection.subscribe(audioPlayer);

      if (!subscription) {
        throw new Error("Failed to subscribe connection to audio player");
      }

      console.log("[MP3] Starting audio playback");
      audioPlayer.play(resource);

      // Wait a moment to ensure playback started successfully
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Playback failed to start within timeout"));
        }, 5000);

        const onPlaying = () => {
          clearTimeout(timeout);
          audioPlayer!.off(AudioPlayerStatus.Playing, onPlaying);
          audioPlayer!.off("error", onError);
          resolve();
        };

        const onError = (error: Error) => {
          clearTimeout(timeout);
          audioPlayer!.off(AudioPlayerStatus.Playing, onPlaying);
          audioPlayer!.off("error", onError);
          reject(error);
        };

        audioPlayer!.on(AudioPlayerStatus.Playing, onPlaying);
        audioPlayer!.once("error", onError);

        // Handle case where it's already playing
        if (audioPlayer!.state.status === AudioPlayerStatus.Playing) {
          onPlaying();
        }
      });

      console.log(`[MP3] Successfully started playback of: ${audioName}`);

      return {
        success: true,
        message: `Selvä! Äänitiedosto "${audioName}" soi nyt!`,
      };
    } catch (error) {
      console.error(`[MP3] Comprehensive error for ${audioName}:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        audioUrl,
        guildId,
        channelId: channel.id,
      });

      // Enhanced cleanup on error
      if (audioPlayer) {
        try {
          audioPlayer.stop(true);
        } catch (e) {
          console.error("[MP3] Error stopping audio player:", e);
        }
      }

      if (connection) {
        try {
          connection.destroy();
        } catch (e) {
          console.error("[MP3] Error destroying connection:", e);
        }
      }

      this.cleanupDirectAudio();

      // Return detailed error message based on error type
      let userMessage =
        "Jotaki meni pielee ku yritettii soittaa tuo äänitiedosto!";

      if (error instanceof Error) {
        if (
          error.message.includes("timeout") ||
          error.message.includes("Timeout")
        ) {
          userMessage =
            "Äänitiedoston lataus kesti liian kauan! Tarkista internet-yhteys.";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("Permission")
        ) {
          userMessage = "Ei oikeuksii äänikanaval! Tarkista botin oikeudet.";
        } else if (
          error.message.includes("resource") ||
          error.message.includes("Resource")
        ) {
          userMessage =
            "Äänitiedoston käsittely epäonnistus! Tiedosto saattaa olla vioittunut.";
        } else if (
          error.message.includes("connection") ||
          error.message.includes("Connection")
        ) {
          userMessage = "Yhteys äänikanaval katos! Yritä uudestaan.";
        } else if (
          error.message.includes("ffmpeg") ||
          error.message.includes("FFMPEG")
        ) {
          userMessage =
            "Audio-käsittely epäonnistus! Palvelimessa saattaa olla ongelma.";
        }
      }

      return {
        success: false,
        error: error,
        message: `${userMessage} (${
          error instanceof Error ? error.message : "Tuntematon virhe"
        })`,
      };
    }
  }

  /**
   * Enhanced cleanup with better error handling
   */
  private cleanupDirectAudio(): void {
    console.log("[MP3] Cleaning up direct audio state");

    try {
      if (this.directAudioState.player) {
        this.directAudioState.player.stop(true);
        this.directAudioState.player.removeAllListeners();
      }
    } catch (error) {
      console.error("[MP3] Error cleaning up audio player:", error);
    }

    try {
      if (this.directAudioState.connection) {
        if (
          this.directAudioState.connection.state.status !==
          VoiceConnectionStatus.Destroyed
        ) {
          this.directAudioState.connection.destroy();
        }
      }
    } catch (error) {
      console.error("[MP3] Error cleaning up voice connection:", error);
    }

    this.directAudioState = {
      isPlaying: false,
      connection: null,
      player: null,
      currentTrack: null,
      guildId: null,
    };

    console.log("[MP3] Direct audio cleanup completed");
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
      // Check if this is a direct audio file URL
      if (isAudioFile && this.isDirectAudioURL(query)) {
        return await this.playDirectAudio(
          channel,
          query,
          audioFileName || "Äänitiedosto",
          metadata.requestedBy,
          channel.guild.id
        );
      }

      // Check if direct audio is currently playing
      if (this.directAudioState.isPlaying) {
        return {
          success: false,
          message: `Nyt soi äänitiedosto "${this.directAudioState.currentTrack?.title}". Käytä \`i.stop\` lopettaakses sen ensin!`,
        };
      }

      // Regular YouTube/streaming service handling
      const { track } = await this.player.play(channel, query, {
        nodeOptions: {
          metadata: metadata,
        },
      });

      return {
        success: true,
        track: track,
        message: ``,
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
        message: "Pitää olla äänikanavas et voi soittaa musiikkii!",
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      const trackName =
        this.directAudioState.currentTrack?.title || "äänitiedosto";
      this.cleanupDirectAudio();
      return {
        success: true,
        message: `Äänitiedosto "${trackName}" lopetettii!`,
      };
    }

    // Handle discord-player queue
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      if (this.directAudioState.player) {
        this.directAudioState.player.pause();
        return {
          success: true,
          message: "Äänitiedosto pysäytettii!",
        };
      }
    }

    // Handle discord-player queue
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      if (this.directAudioState.player) {
        this.directAudioState.player.unpause();
        return {
          success: true,
          message: "Äänitiedosto jatkuu!",
        };
      }
    }

    // Handle discord-player queue
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      const trackName =
        this.directAudioState.currentTrack?.title || "äänitiedosto";
      this.cleanupDirectAudio();
      return {
        success: true,
        message: `Äänitiedosto "${trackName}" ohitettii!`,
      };
    }

    // Handle discord-player queue
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
    // Direct audio doesn't support volume control easily
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      return {
        success: false,
        message:
          "Äänenvoimakkuuden säätö ei toimi äänitiedostoi kans. Käytä Discordin omaa äänenvoimakkuus-säätöö!",
      };
    }

    // Handle discord-player queue
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      const track = this.directAudioState.currentTrack!;
      const embed = new EmbedBuilder()
        .setDescription(
          `**Nyt soimassa (Äänitiedosto)**\n` +
            `${track.title} -- <@${track.requestedBy.id}>\n\n` +
            `**Jono**\nTyhjä (äänitiedostoi ei voi lisätä jonoo)`
        )
        .setColor("#FF0000")
        .setFooter({
          text: "Äänitiedosto - Ei jonoo saatavil",
        });

      return {
        success: true,
        embed: embed,
      };
    }

    // Handle discord-player queue
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
    // Check if direct audio is playing
    if (
      this.directAudioState.isPlaying &&
      this.directAudioState.guildId === guildId
    ) {
      const track = this.directAudioState.currentTrack!;
      const embed = new EmbedBuilder()
        .setTitle("Nyt soimassa (Äänitiedosto)")
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: "Tyyppi", value: "Äänitiedosto", inline: true },
          { name: "Kesto", value: "Tuntematon", inline: true },
          { name: "Edistyminen", value: "Tuntematon", inline: true },
          { name: "Äänenvoimakkuus", value: "Discord-säädöt", inline: true },
          { name: "Toisto", value: "Ei saatavil", inline: true },
          { name: "Pyysi", value: `${track.requestedBy}`, inline: true }
        )
        .setColor("#FF0000");

      return {
        success: true,
        embed: embed,
      };
    }

    // Handle discord-player queue
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

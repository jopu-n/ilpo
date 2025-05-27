import { Message, GuildMember, EmbedBuilder } from "discord.js";
import { useQueue } from "discord-player";

export interface PrefixCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  execute: (message: Message<boolean>, args: string[]) => Promise<void>;
}

export class PrefixCommandHandler {
  private commands = new Map<string, PrefixCommand>();
  private prefixes = ["i.", "ilpo."];

  constructor() {
    this.loadCommands();
  }

  private loadCommands(): void {
    // Play command
    this.registerCommand({
      name: "play",
      aliases: ["p", "soita", "soitahan"],
      description: "Play a song from YouTube",
      usage: "play <song name or URL>",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const player = global.player;
        const channel = (message.member as GuildMember)?.voice.channel;

        if (!channel) {
          await message.reply(
            "❌ Sinun täytyy olla äänikanavassa soittaaksesi musiikkia! / You need to be in a voice channel!"
          );
          return;
        }

        if (!args.length) {
          await message.reply(
            "❌ Anna laulun nimi tai YouTube-linkki! / Please provide a song name or YouTube URL!"
          );
          return;
        }

        const query = args.join(" ");

        try {
          const { track } = await player.play(channel, query, {
            nodeOptions: {
              metadata: {
                channel: message.channel,
                client: message.guild?.members.me,
                requestedBy: message.author,
              },
            },
          });

          await message.reply(
            `🎵 **${track.title}** lisätty jonoon! / added to queue!`
          );
        } catch (error) {
          console.log(error);
          await message.reply(
            "❌ Jotain meni vikaan laulua soittaessa! / Something went wrong while trying to play that song!"
          );
        }
      },
    });

    // Stop command
    this.registerCommand({
      name: "stop",
      aliases: ["seis", "lopeta"],
      description: "Stop music and clear the queue",
      usage: "stop",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        queue.delete();
        await message.reply(
          "⏹️ Musiikki pysäytetty ja jono tyhjennetty! / Music stopped and queue cleared!"
        );
      },
    });

    // Pause command
    this.registerCommand({
      name: "pause",
      aliases: ["tauko", "pysäytä"],
      description: "Pause the current song",
      usage: "pause",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        if (queue.node.isPaused()) {
          await message.reply(
            "⏸️ Musiikki on jo pysäytetty! / Music is already paused!"
          );
          return;
        }

        queue.node.pause();
        await message.reply("⏸️ Musiikki pysäytetty! / Music paused!");
      },
    });

    // Resume command
    this.registerCommand({
      name: "resume",
      aliases: ["jatka", "käynnistä"],
      description: "Resume the paused music",
      usage: "resume",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        if (!queue.node.isPaused()) {
          await message.reply(
            "▶️ Musiikki ei ole pysäytetty! / Music is not paused!"
          );
          return;
        }

        queue.node.resume();
        await message.reply("▶️ Musiikki jatkuu! / Music resumed!");
      },
    });

    // Skip command
    this.registerCommand({
      name: "skip",
      aliases: ["ohita", "hyppää", "seuraava"],
      description: "Skip the current song",
      usage: "skip",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();

        await message.reply(
          `⏭️ **${currentTrack.title}** ohitettu! / skipped!`
        );
      },
    });

    // Queue command
    this.registerCommand({
      name: "queue",
      aliases: ["q", "jono", "lista"],
      description: "Display the music queue",
      usage: "queue [page number]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        const totalPages = Math.ceil(queue.tracks.data.length / 10) || 1;
        const page = (parseInt(args[0]) || 1) - 1;

        if (page >= totalPages) {
          await message.reply(
            `❌ Virheellinen sivu. Sivuja on vain ${totalPages}. / Invalid page. There are only ${totalPages} pages available.`
          );
          return;
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
            `**Nyt soimassa / Currently Playing**\n` +
              (currentTrack
                ? `\`[${currentTrack.duration}]\` ${currentTrack.title} -- <@${
                    currentTrack.requestedBy!.id
                  }>`
                : "Ei mitään / None") +
              `\n\n**Jono / Queue**\n${
                queueString || "Jono on tyhjä / Queue is empty"
              }`
          )
          .setColor("#FF0000")
          .setThumbnail(currentTrack.thumbnail)
          .setFooter({
            text: `Sivu ${page + 1}/${totalPages} | ${
              queue.tracks.data.length
            } laulua jonossa | ${queue.estimatedDuration} kokonaiskesto`,
          });

        await message.reply({ embeds: [embed] });
      },
    });

    // Now playing command
    this.registerCommand({
      name: "nowplaying",
      aliases: ["np", "nytkuunnelmassa", "mitäsoi", "mikäsoi"],
      description: "Display the currently playing song",
      usage: "nowplaying",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        const track = queue.currentTrack;
        const timestamp = queue.node.getTimestamp();
        const trackDuration =
          !timestamp || timestamp.progress === Infinity
            ? "infinity (live)"
            : track.duration;

        const embed = new EmbedBuilder()
          .setTitle("🎵 Nyt soimassa / Now Playing")
          .setDescription(`**${track.title}**`)
          .addFields(
            { name: "👤 Artisti / Author", value: track.author, inline: true },
            { name: "⏱️ Kesto / Duration", value: trackDuration, inline: true },
            {
              name: "📊 Edistyminen / Progress",
              value:
                !timestamp || timestamp.progress === Infinity
                  ? "infinity (live)"
                  : `${timestamp.current.label} / ${timestamp.total.label}`,
              inline: true,
            },
            {
              name: "🔊 Äänenvoimakkuus / Volume",
              value: `${queue.node.volume}%`,
              inline: true,
            },
            {
              name: "🔁 Toisto / Loop",
              value: queue.repeatMode
                ? queue.repeatMode === 2
                  ? "Jono / Queue"
                  : "Kappale / Track"
                : "Pois / Off",
              inline: true,
            },
            {
              name: "🎧 Pyysi / Requested by",
              value: `${track.requestedBy}`,
              inline: true,
            }
          )
          .setThumbnail(track.thumbnail)
          .setColor("#FF0000");

        await message.reply({ embeds: [embed] });
      },
    });

    // Volume command
    this.registerCommand({
      name: "volume",
      aliases: ["vol", "v", "äänenvoimakkuus", "ääni"],
      description: "Change or check the music volume",
      usage: "volume [0-100]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply(
            "❌ Ei musiikkia soimassa! / No music is currently being played!"
          );
          return;
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume)) {
          await message.reply(
            `🔊 Nykyinen äänenvoimakkuus on **${queue.node.volume}%** / Current volume is **${queue.node.volume}%**`
          );
          return;
        }

        if (volume < 0 || volume > 100) {
          await message.reply(
            "❌ Äänenvoimakkuus täytyy olla 0-100 väliltä! / Volume must be between 0-100!"
          );
          return;
        }

        queue.node.setVolume(volume);
        await message.reply(
          `🔊 Äänenvoimakkuus asetettu **${volume}%**! / Volume set to **${volume}%**!`
        );
      },
    });

    // Help command
    this.registerCommand({
      name: "help",
      aliases: ["h", "apua", "komennot", "commands"],
      description: "Show all available commands",
      usage: "help [command name]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        if (args.length > 0) {
          const commandName = args[0].toLowerCase();
          const command = this.commands.get(commandName);

          if (!command) {
            await message.reply(
              "❌ Komentoa ei löytynyt! Kirjoita `i.help` nähdäksesi kaikki komennot. / Command not found! Type `i.help` to see all commands."
            );
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`📝 Komento / Command: ${command.name}`)
            .setDescription(command.description)
            .addFields(
              {
                name: "📖 Käyttö / Usage",
                value: `\`${this.prefixes[0]}${command.usage}\``,
                inline: false,
              },
              {
                name: "🏷️ Aliakset / Aliases",
                value: command.aliases
                  .map((alias) => `\`${alias}\``)
                  .join(", "),
                inline: false,
              },
              {
                name: "💡 Esimerkit / Examples",
                value: this.getExamplesForCommand(command.name),
                inline: false,
              }
            )
            .setColor("#0099ff");

          await message.reply({ embeds: [embed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🎵 Ilpo - Kaikki Komennot / All Commands")
          .setDescription(
            "**Kahdella tavalla käytettävissä / Available in two ways:**\n\n" +
              "⚡ **Slash Commands**: `/command` (type `/` to see them)\n" +
              "🔤 **Prefix Commands**: `i.command` tai `ilpo.command`\n\n" +
              `**Prefiksit / Prefixes:** ${this.prefixes
                .map((p) => `\`${p}\``)
                .join(" tai / or ")}`
          )
          .addFields(
            {
              name: "🎵 Musiikki / Music",
              value:
                "🎶 **play** (`p`, `soita`, `soitahan`) - Soita laulu / Play song\n" +
                "⏹️ **stop** (`seis`, `lopeta`) - Pysäytä / Stop\n" +
                "⏸️ **pause** (`tauko`) - Tauko / Pause\n" +
                "▶️ **resume** (`jatka`) - Jatka / Resume\n" +
                "⏭️ **skip** (`ohita`, `hyppää`) - Ohita / Skip",
              inline: false,
            },
            {
              name: "📋 Tiedot / Information",
              value:
                "📜 **queue** (`q`, `jono`, `lista`) - Näytä jono / Show queue\n" +
                "🎵 **nowplaying** (`np`, `mitäsoi`, `mikäsoi`) - Mikä soi? / What's playing?\n" +
                "🔊 **volume** (`vol`, `v`, `ääni`) - Äänenvoimakkuus / Volume",
              inline: false,
            },
            {
              name: "🇫🇮 Suomalaiset Pikakomennot / Finnish Quick Commands",
              value:
                "`ilpo.soitahan <laulu>` 🎵\n" +
                "`ilpo.seis` ⏹️\n" +
                "`ilpo.mitäsoi` ❓\n" +
                "`ilpo.ohita` ⏭️\n" +
                "`ilpo.jono` 📜",
              inline: false,
            },
            {
              name: "💡 Lisäapu / Additional Help",
              value:
                "**Yksityiskohtaiset ohjeet / Detailed help:**\n" +
                "`i.help <komento>` tai `ilpo.apua <komento>`\n" +
                "**Slash-komennot / Slash commands:**\n" +
                "`/help` - Näytä slash-komennot / Show slash commands",
              inline: false,
            }
          )
          .setFooter({
            text: "💡 Esim: 'i.help play' tai 'ilpo.apua soita' / Example: 'i.help play' or 'ilpo.apua soita'",
          })
          .setColor("#0099ff");

        await message.reply({ embeds: [embed] });
      },
    });
  }

  private getExamplesForCommand(commandName: string): string {
    const examples: Record<string, string> = {
      play: "`i.play despacito`\n`ilpo.soita rick roll`\n`i.p https://youtube.com/...`",
      stop: "`i.stop`\n`ilpo.seis`\n`i.lopeta`",
      pause: "`i.pause`\n`ilpo.tauko`",
      resume: "`i.resume`\n`ilpo.jatka`",
      skip: "`i.skip`\n`ilpo.ohita`\n`i.hyppää`",
      queue: "`i.queue`\n`ilpo.jono 2`\n`i.q`",
      nowplaying: "`i.np`\n`ilpo.mitäsoi`\n`i.nytkuunnelmassa`",
      volume: "`i.volume`\n`i.vol 50`\n`ilpo.ääni 80`",
      help: "`i.help`\n`ilpo.apua play`\n`i.komennot`",
    };

    return (
      examples[commandName] ||
      "Ei esimerkkejä saatavilla / No examples available"
    );
  }

  private registerCommand(command: PrefixCommand): void {
    // Register main command name
    this.commands.set(command.name, command);

    // Register all aliases
    command.aliases.forEach((alias) => {
      this.commands.set(alias.toLowerCase(), command);
    });
  }

  public async handleMessage(message: Message<boolean>): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const content = message.content.toLowerCase();

    // Check if message starts with any of our prefixes
    const usedPrefix = this.prefixes.find((prefix) =>
      content.startsWith(prefix.toLowerCase())
    );
    if (!usedPrefix) return;

    // Extract command and arguments
    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Find and execute command
    const command = this.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing prefix command ${commandName}:`, error);
      await message.reply(
        "❌ Virhe komentoa suorittaessa! / Error executing command!"
      );
    }
  }
}

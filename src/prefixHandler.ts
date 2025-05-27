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
      description: "Soita biisi YouTubesta",
      usage: "play <biisin nimi tai URL>",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const player = global.player;
        const channel = (message.member as GuildMember)?.voice.channel;

        if (!channel) {
          await message.reply(
            "Pitää olla äänikanavas et voi soittaa musiikkii!"
          );
          return;
        }

        if (!args.length) {
          await message.reply("Anna joku biisin nimi tai YouTube-linkki!");
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
        } catch (error) {
          console.log(error);
          await message.reply(
            "Jotaki meni pielee kun yritettii soittaa tuo biisi!"
          );
        }
      },
    });

    // Stop command
    this.registerCommand({
      name: "stop",
      aliases: ["seis", "lopeta"],
      description: "Lopeta musiikki ja tyhjennä jono",
      usage: "stop",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        queue.delete();
        await message.reply("Musiikki lopetettii ja jono tyhjennettii!");
      },
    });

    // Pause command
    this.registerCommand({
      name: "pause",
      aliases: ["tauko", "pysäytä"],
      description: "Pysäytä nykynen biisi",
      usage: "pause",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        if (queue.node.isPaused()) {
          await message.reply("Musiikki o jo pysäytettynä!");
          return;
        }

        queue.node.pause();
        await message.reply("Musiikki pysäytettii!");
      },
    });

    // Resume command
    this.registerCommand({
      name: "resume",
      aliases: ["jatka", "käynnistä"],
      description: "Jatka pysäytettyy musiikkii",
      usage: "resume",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        if (!queue.node.isPaused()) {
          await message.reply("Musiikki ei oo pysäytettynä!");
          return;
        }

        queue.node.resume();
        await message.reply("Musiikki jatkuu!");
      },
    });

    // Skip command
    this.registerCommand({
      name: "skip",
      aliases: ["ohita", "hyppää", "seuraava"],
      description: "Hyppää nykysen biisin yli",
      usage: "skip",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();

        await message.reply(`Biisi ${currentTrack.title} ohitettii!`);
      },
    });

    // Queue command
    this.registerCommand({
      name: "queue",
      aliases: ["q", "jono", "lista"],
      description: "Näytä musiikkijono",
      usage: "queue [sivunumero]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        const totalPages = Math.ceil(queue.tracks.data.length / 10) || 1;
        const page = (parseInt(args[0]) || 1) - 1;

        if (page >= totalPages) {
          await message.reply(`Väärä sivu. Sivui o vaa ${totalPages}.`);
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
            text: `Sivu ${page + 1}/${totalPages} | ${
              queue.tracks.data.length
            } biisii jonos | ${queue.estimatedDuration} kokonaiskesto`,
          });

        await message.reply({ embeds: [embed] });
      },
    });

    // Now playing command
    this.registerCommand({
      name: "nowplaying",
      aliases: ["np", "nytkuunnelmassa", "mitäsoi", "mikäsoi"],
      description: "Näytä mikä biisi soi nyt",
      usage: "nowplaying",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
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
            {
              name: "Pyysi",
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
      description: "Muuta tai tarkista äänenvoimakkuus",
      usage: "volume [0-100]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const queue = useQueue(message.guild!.id);

        if (!queue || !queue.currentTrack) {
          await message.reply("Ei oo mitää musiikkii soimassa!");
          return;
        }

        const volume = parseInt(args[0]);

        if (isNaN(volume)) {
          await message.reply(`Äänenvoimakkuus o nyt ${queue.node.volume}%`);
          return;
        }

        if (volume < 0 || volume > 100) {
          await message.reply("Äänenvoimakkuuden pitää olla 0-100 väliltä!");
          return;
        }

        queue.node.setVolume(volume);
        await message.reply(`Äänenvoimakkuus asetettu ${volume}%!`);
      },
    });

    // Help command
    this.registerCommand({
      name: "help",
      aliases: ["h", "apua", "komennot", "commands"],
      description: "Näytä kaikki käytettävissä olevat komennot",
      usage: "help [komennon nimi]",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        if (args.length > 0) {
          const commandName = args[0].toLowerCase();
          const command = this.commands.get(commandName);

          if (!command) {
            await message.reply(
              "Komentoo ei löydy! Kirjota `i.help` nähäkses kaikki komennot."
            );
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`Komento: ${command.name}`)
            .setDescription(command.description)
            .addFields(
              {
                name: "Käyttö",
                value: `\`${this.prefixes[0]}${command.usage}\``,
                inline: false,
              },
              {
                name: "Aliakset",
                value: command.aliases
                  .map((alias) => `\`${alias}\``)
                  .join(", "),
                inline: false,
              },
              {
                name: "Esimerkit",
                value: this.getExamplesForCommand(command.name),
                inline: false,
              }
            )
            .setColor("#0099ff");

          await message.reply({ embeds: [embed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Ilpo - Kaikki Komennot")
          .setDescription(
            "**Kahdel taval käytettävissä:**\n\n" +
              "Slash Commands: `/command`\n" +
              "Prefix Commands: `i.command` tai `ilpo.command`\n\n" +
              `**Prefiksit:** ${this.prefixes
                .map((p) => `\`${p}\``)
                .join(" tai ")}`
          )
          .addFields(
            {
              name: "Musiikki",
              value:
                "**play** (`p`, `soita`, `soitahan`) - Soita biisi\n" +
                "**stop** (`seis`, `lopeta`) - Lopeta\n" +
                "**pause** (`tauko`) - Tauko\n" +
                "**resume** (`jatka`) - Jatka\n" +
                "**skip** (`ohita`, `hyppää`) - Ohita",
              inline: false,
            },
            {
              name: "Tiedot",
              value:
                "**queue** (`q`, `jono`, `lista`) - Näytä jono\n" +
                "**nowplaying** (`np`, `mitäsoi`, `mikäsoi`) - Mikä soi?\n" +
                "**volume** (`vol`, `v`, `ääni`) - Äänenvoimakkuus",
              inline: false,
            },
            {
              name: "Suomalaiset Pikakomennot",
              value:
                "`ilpo.soitahan <biisi>`\n" +
                "`ilpo.seis`\n" +
                "`ilpo.mitäsoi`\n" +
                "`ilpo.ohita`\n" +
                "`ilpo.jono`",
              inline: false,
            },
            {
              name: "Lisäapu",
              value:
                "**Yksityiskohtaiset ohjeet:**\n" +
                "`i.help <komento>` tai `ilpo.apua <komento>`\n" +
                "**Slash-komennot:**\n" +
                "`/help` - Näytä slash-komennot",
              inline: false,
            }
          )
          .setFooter({
            text: "Esim: 'i.help play' tai 'ilpo.apua soita'",
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

    return examples[commandName] || "Ei esimerkkei saatavil";
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
      console.error(
        `Virhe prefix-komentoa suorittaessa ${commandName}:`,
        error
      );
      await message.reply("Jotaki meni pielee komentoo suorittaessa!");
    }
  }
}

import { Message, GuildMember, EmbedBuilder } from "discord.js";
import { MusicManager } from "./managers/MusicManager";
import { AISongService } from "./services/AISongService";
import fs from "fs";
import path from "path";

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
  private musicManager: MusicManager;
  private aiSongService: AISongService | null = null;

  constructor(player: any) {
    this.musicManager = new MusicManager(player);

    // Try to initialize AI service, but don't fail if it's not available
    try {
      this.aiSongService = new AISongService();
    } catch (error) {
      console.error("Failed to initialize AI Song Service:", error);
      console.log(
        "Random song command will be disabled. Make sure GEMINI_API_KEY is set in .env file."
      );
      this.aiSongService = null;
    }

    this.loadCommands();
  }

  private loadCommands(): void {
    // Play command with audio file support
    this.registerCommand({
      name: "play",
      aliases: ["p", "soita", "soitahan"],
      description: "Soita biisi YouTubesta tai äänitiedosto",
      usage: "play <biisin nimi tai URL> TAI vastaa äänitiedostoo",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        const member = message.member as GuildMember;
        const result = await this.musicManager.handlePlay(
          message.guild!.id,
          member?.voice.channel || null,
          args.join(" ") || null,
          message.author,
          message.channel,
          message.guild?.members.me,
          message // Pass message for audio file detection
        );

        result.message == "" ? null : await message.reply(result.message);
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
        const result = await this.musicManager.stop(message.guild!.id);
        await message.reply(result.message);
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
        const result = await this.musicManager.pause(message.guild!.id);
        await message.reply(result.message);
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
        const result = await this.musicManager.resume(message.guild!.id);
        await message.reply(result.message);
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
        const result = await this.musicManager.skip(message.guild!.id);
        await message.reply(result.message);
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
        const page = parseInt(args[0]) || 1;
        const result = this.musicManager.getQueueEmbed(message.guild!.id, page);

        if (result.success) {
          await message.reply({ embeds: [result.embed!] });
        } else {
          await message.reply(result.message!);
        }
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
        const result = this.musicManager.getNowPlayingEmbed(message.guild!.id);

        if (result.success) {
          await message.reply({ embeds: [result.embed!] });
        } else {
          await message.reply(result.message!);
        }
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
        const volume = parseInt(args[0]);
        const result = await this.musicManager.volume(
          message.guild!.id,
          isNaN(volume) ? undefined : volume
        );

        await message.reply(result.message);
      },
    });

    // Random song command - AI powered
    this.registerCommand({
      name: "randomsong",
      aliases: ["rs", "random", "surprise", "yllätä"],
      description:
        "Pyydä AI:ta ehdottamaan satunnainen biisi kuvauksen perusteella",
      usage: "randomsong [kuvaus] TAI randomsong (täysin satunnainen)",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        if (!this.aiSongService) {
          await message.reply(
            "AI-biisisuositukset ei oo käytössä! Tarkista että GEMINI_API_KEY o asetettu .env-tiedostoos."
          );
          return;
        }

        const member = message.member as GuildMember;
        const channel = member?.voice.channel;

        if (!channel) {
          await message.reply(
            "Pitää olla äänikanavas et voi käyttää tätä komentoo!"
          );
          return;
        }

        const description = args.join(" ").trim() || undefined;

        // Send initial message
        const loadingMessage = await message.reply(
          description
            ? `🤖 AI miettii biisii kuvauksel "${description}"...`
            : "🤖 AI miettii täysin satunnaist biisii..."
        );

        try {
          // Generate song with AI
          const result = await this.aiSongService.generateSong(description);

          if (!result.success) {
            await loadingMessage.edit(
              `❌ AI-virhe: ${result.error || "Tuntematon virhe"}`
            );
            return;
          }

          const songName = result.songName!;

          // Update loading message
          await loadingMessage.edit(
            `🎵 AI ehdotti: **${songName}**\nHaetaa YouTubesta...`
          );

          // Play the suggested song
          const playResult = await this.musicManager.handlePlay(
            message.guild!.id,
            channel,
            songName,
            message.author,
            message.channel,
            message.guild?.members.me
          );

          if (playResult.success) {
            await loadingMessage.edit(
              `✅ AI ehdotti: **${songName}**\n${
                playResult.message || "Biisi soitetaa!"
              }`
            );
          } else {
            await loadingMessage.edit(
              `⚠️ AI ehdotti: **${songName}**\nMutta ${playResult.message}`
            );
          }
        } catch (error) {
          console.error("Random song command error:", error);
          await loadingMessage.edit(
            "❌ Jotaki meni pielee AI-biisisuosituksen kans!"
          );
        }
      },
    });

    // Tomi command - Random line from aijamatto.txt
    this.registerCommand({
      name: "tomi",
      aliases: ["rsä"],
      description: "Satunnainen Tomi-lainaus",
      usage: "tomi",
      execute: async (
        message: Message<boolean>,
        args: string[]
      ): Promise<void> => {
        try {
          const filePath = path.join(
            __dirname,
            "..",
            "resources",
            "aijamatto.txt"
          );
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const lines = fileContent
            .split("\n")
            .filter((line) => line.trim() !== "");

          if (lines.length === 0) {
            await message.reply("Aijamatto-tiedosto o tyhjä!");
            return;
          }

          const randomIndex = Math.floor(Math.random() * lines.length);
          const randomLine = lines[randomIndex];

          await message.reply(randomLine);
        } catch (error) {
          console.error("Virhe luettaessa aijamatto.txt:", error);
          await message.reply(
            "Jotaki meni pielee ku yritettii lukee Tomi-lainauksia!"
          );
        }
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

        // Show all commands overview
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
                "**play** (`p`, `soita`, `soitahan`) - Soita biisi tai äänitiedosto\n" +
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
              name: "AI & Viihde",
              value:
                "**randomsong** (`rs`, `random`, `surprise`, `yllätä`) - AI-biisisuositus\n" +
                "**tomi** (`rsä`) - Satunnainen Tomi-lainaus",
              inline: false,
            },
            {
              name: "Äänitiedostot",
              value:
                "**Samassa viestissä:** Lähetä äänitiedosto + `i.p` samassa viestissä\n" +
                "**Vastausviesti:** Vastaa äänitiedostoo komennol `i.p`\n" +
                "Tuetut: MP3, WAV, M4A, OGG, FLAC ja muut äänitiedostot",
              inline: false,
            },
            {
              name: "Suomalaiset Pikakomennot",
              value:
                "`ilpo.soitahan <biisi>`\n" +
                "`ilpo.seis`\n" +
                "`ilpo.mitäsoi`\n" +
                "`ilpo.ohita`\n" +
                "`ilpo.jono`\n" +
                "`ilpo.yllätä` tai `ilpo.rs` - AI-biisisuositus\n" +
                "`ilpo.tomi` tai `ilpo.rsä` - Tomi-lainaus",
              inline: false,
            },
            {
              name: "Lisäapu",
              value:
                "**Yksityiskohtaiset ohjeet:**\n" +
                "`i.help <komento>` tai `ilpo.apua <komento>`\n" +
                "**Slash-komennot:**\n" +
                "`/help` - Näytä slash-komennot\n" +
                "**Sekä YouTube että äänitiedostot toimii!**",
              inline: false,
            }
          )
          .setFooter({
            text: "Esim: 'i.help play' tai 'ilpo.apua randomsong' tai 'ilpo.yllätä'",
          })
          .setColor("#0099ff");

        await message.reply({ embeds: [embed] });
      },
    });
  }

  private getExamplesForCommand(commandName: string): string {
    const examples: Record<string, string> = {
      play: "`i.play despacito`\n`ilpo.soita rick roll`\n`i.p https://youtube.com/...`\n**Äänitiedosto:** Lähetä tiedosto + `i.p` tai vastaa tiedostoo `i.p`",
      stop: "`i.stop`\n`ilpo.seis`\n`i.lopeta`",
      pause: "`i.pause`\n`ilpo.tauko`",
      resume: "`i.resume`\n`ilpo.jatka`",
      skip: "`i.skip`\n`ilpo.ohita`\n`i.hyppää`",
      queue: "`i.queue`\n`ilpo.jono 2`\n`i.q`",
      nowplaying: "`i.np`\n`ilpo.mitäsoi`\n`i.nytkuunnelmassa`",
      volume: "`i.volume`\n`i.vol 50`\n`ilpo.ääni 80`",
      help: "`i.help`\n`ilpo.apua play`\n`i.komennot`",
      tomi: "`i.tomi`\n`ilpo.tomi`\n`ilpo.rsä`",
      randomsong:
        "`i.randomsong`\n`i.rs melancholic indie song`\n`ilpo.yllätä electronic`\n`ilpo.surprise` (täysin satunnainen)",
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

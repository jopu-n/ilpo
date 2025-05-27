import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Näytä kaikki käytettävissä olevat komennot")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Hanki yksityiskohtaset tiedot tietystä komennosta")
        .setRequired(false)
        .addChoices(
          { name: "play", value: "play" },
          { name: "stop", value: "stop" },
          { name: "pause", value: "pause" },
          { name: "resume", value: "resume" },
          { name: "skip", value: "skip" },
          { name: "queue", value: "queue" },
          { name: "nowplaying", value: "nowplaying" },
          { name: "volume", value: "volume" }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const specificCommand = interaction.options.getString("command");

    if (specificCommand) {
      // Show detailed info for specific command
      const commandDetails = getCommandDetails(specificCommand);

      const embed = new EmbedBuilder()
        .setTitle(`Komento: ${specificCommand}`)
        .setDescription(commandDetails.description)
        .addFields(
          {
            name: "Slash Command",
            value: commandDetails.slash,
            inline: false,
          },
          {
            name: "Prefix Commands",
            value: commandDetails.prefix,
            inline: false,
          },
          {
            name: "Esimerkit",
            value: commandDetails.examples,
            inline: false,
          }
        )
        .setColor("#0099ff");

      return interaction.reply({ embeds: [embed] });
    }

    // Show all commands overview
    const embed = new EmbedBuilder()
      .setTitle("Ilpo - Kaikki Komennot")
      .setDescription(
        "**Kahdel taval käytettävissä:**\n\n" +
          "Slash Commands: `/command`\n" +
          "Prefix Commands: `i.command` tai `ilpo.command`"
      )
      .addFields(
        {
          name: "Musiikkikomennot",
          value:
            "`/play` `i.play`, `i.p`, `ilpo.soita`, `ilpo.soitahan`\n" +
            "`/stop` `i.stop`, `ilpo.seis`, `ilpo.lopeta`\n" +
            "`/pause` `i.pause`, `ilpo.tauko`\n" +
            "`/resume` `i.resume`, `ilpo.jatka`\n" +
            "`/skip` `i.skip`, `ilpo.ohita`, `ilpo.hyppää`",
          inline: false,
        },
        {
          name: "Tietokomennot",
          value:
            "`/queue` `i.queue`, `i.q`, `ilpo.jono`, `ilpo.lista`\n" +
            "`/nowplaying` `i.np`, `ilpo.mitäsoi`, `ilpo.mikäsoi`\n" +
            "`/volume` `i.vol`, `ilpo.ääni`",
          inline: false,
        },
        {
          name: "Apukomennot",
          value:
            "`/help` `i.help`, `i.apua`, `ilpo.komennot`\n" +
            "`/ping` Vain slash\n" +
            "`/user` Vain slash",
          inline: false,
        },
        {
          name: "Suomalaiset Pikakomennot",
          value:
            "`ilpo.soitahan <biisi>` - Soita biisi\n" +
            "`ilpo.seis` - Lopeta musiikki\n" +
            "`ilpo.mitäsoi` - Mikä soi?\n" +
            "`ilpo.ohita` - Hyppää seuraavaa\n" +
            "`ilpo.jono` - Näytä jono",
          inline: false,
        }
      )
      .setFooter({
        text: "Käytä '/help <komento>' tai 'i.help <komento>' saadakses lisätietoi",
      })
      .setColor("#0099ff");

    return interaction.reply({ embeds: [embed] });
  },
};

function getCommandDetails(command: string) {
  const details: Record<string, any> = {
    play: {
      description: "Soita biisi YouTubesta",
      slash: "`/play <biisin nimi tai URL>`",
      prefix:
        "`i.play <haku>`, `i.p <haku>`, `ilpo.soita <haku>`, `ilpo.soitahan <haku>`",
      examples:
        "`/play despacito`\n`i.p rick roll`\n`ilpo.soitahan https://youtube.com/...`",
    },
    stop: {
      description: "Lopeta musiikki ja tyhjennä jono",
      slash: "`/stop`",
      prefix: "`i.stop`, `ilpo.seis`, `ilpo.lopeta`",
      examples: "`/stop`\n`i.stop`\n`ilpo.seis`",
    },
    pause: {
      description: "Pysäytä nykynen biisi",
      slash: "`/pause`",
      prefix: "`i.pause`, `ilpo.tauko`, `ilpo.pysäytä`",
      examples: "`/pause`\n`i.pause`\n`ilpo.tauko`",
    },
    resume: {
      description: "Jatka pysäytettyy musiikkii",
      slash: "`/resume`",
      prefix: "`i.resume`, `ilpo.jatka`, `ilpo.käynnistä`",
      examples: "`/resume`\n`i.resume`\n`ilpo.jatka`",
    },
    skip: {
      description: "Hyppää nykysen biisin yli",
      slash: "`/skip`",
      prefix: "`i.skip`, `ilpo.ohita`, `ilpo.hyppää`, `ilpo.seuraava`",
      examples: "`/skip`\n`i.skip`\n`ilpo.ohita`\n`ilpo.hyppää`",
    },
    queue: {
      description: "Näytä musiikkijono",
      slash: "`/queue [sivunumero]`",
      prefix:
        "`i.queue [sivu]`, `i.q [sivu]`, `ilpo.jono [sivu]`, `ilpo.lista [sivu]`",
      examples: "`/queue`\n`/queue 2`\n`i.q`\n`ilpo.jono 3`",
    },
    nowplaying: {
      description: "Näytä nykysen biisin tiedot",
      slash: "`/nowplaying`",
      prefix:
        "`i.nowplaying`, `i.np`, `ilpo.mitäsoi`, `ilpo.mikäsoi`, `ilpo.nytkuunnelmassa`",
      examples: "`/nowplaying`\n`i.np`\n`ilpo.mitäsoi`\n`ilpo.mikäsoi`",
    },
    volume: {
      description: "Muuta tai tarkista äänenvoimakkuus",
      slash: "`/volume [taso 0-100]`",
      prefix:
        "`i.volume [taso]`, `i.vol [taso]`, `i.v [taso]`, `ilpo.ääni [taso]`",
      examples: "`/volume`\n`/volume 50`\n`i.vol 80`\n`ilpo.ääni 30`",
    },
  };

  return (
    details[command] || {
      description: "Komentoo ei löydy",
      slash: "N/A",
      prefix: "N/A",
      examples: "N/A",
    }
  );
}

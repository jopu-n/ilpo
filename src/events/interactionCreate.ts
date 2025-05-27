import { Events, ChatInputCommandInteraction, Collection } from "discord.js";
import { Command } from "../types";

module.exports = {
  name: Events.InteractionCreate,
  async execute(
    interaction: ChatInputCommandInteraction,
    commands: Collection<string, Command>
  ) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      console.error(`Ei löydy komentoo ${interaction.commandName}.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Jotaki meni pielee tuon komennon kans!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Jotaki meni pielee tuon komennon kans!",
          ephemeral: true,
        });
      }
    }
  },
};

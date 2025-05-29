import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Player } from "discord-player";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Global player declaration for TypeScript
declare global {
  var player: Player;
}

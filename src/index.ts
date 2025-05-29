import { Client, GatewayIntentBits, Collection } from "discord.js";
import { Player } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { PrefixCommandHandler } from "./prefixHandler";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Command } from "./types";

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Required for voice functionality
  ],
});

// Create Discord Player instance
const player = new Player(client);

// Create prefix command handler - PASS THE PLAYER INSTANCE HERE
const prefixHandler = new PrefixCommandHandler(player);

// Register YouTube extractor with better configuration
player.extractors.register(YoutubeiExtractor, {
  streamOptions: {
    useClient: "ANDROID", // Try ANDROID instead of WEB
  },
});

// Load player events
player.events.on("audioTrackAdd", (queue, track) => {
  queue.metadata.channel.send(` **${track.title}** laitettii jonoo!`);
});

player.events.on("audioTracksAdd", (queue, tracks) => {
  queue.metadata.channel.send(`${tracks.length} biisii laitettii jonoo!`);
});

player.events.on("playerStart", (queue, track) => {
  queue.metadata.channel.send(`Alettii soittaa biisii **${track.title}**!`);
});

player.events.on("emptyQueue", (queue) => {
  queue.metadata.channel.send("Jono loppus!");
});

player.events.on("emptyChannel", (queue) => {
  queue.metadata.channel.send("Ei ol kettä äänikanaval, lähen pois...");
});

// Add error event handlers
player.events.on("error", (queue, error) => {
  console.log(`Yleinen player-virhe: ${error.message}`);
  console.log(error);
});

player.events.on("playerError", (queue, error) => {
  console.log(`Player-virhe: ${error.message}`);
  console.log(error);
  queue.metadata.channel.send(
    `Jotaki meni pielee biisin kans: ${error.message}`
  );
});

// Add debug event for more detailed logging
player.events.on("debug", (queue, message) => {
  console.log(`[DEBUG] ${message}`);
});

// Create a collection to store commands
const commands = new Collection<string, Command>();

// Load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.set(command.data.name, command);
  } else {
    console.log(
      `[VAROITUS] Komennos ${filePath} puuttuu "data" tai "execute" -ominaisuus.`
    );
  }
}

// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, commands));
  } else {
    client.on(event.name, (...args) => event.execute(...args, commands));
  }
}

// Handle prefix commands
client.on("messageCreate", async (message) => {
  await prefixHandler.handleMessage(message);
});

// Make player available globally for commands (for slash commands)
declare global {
  var player: Player;
}
global.player = player;

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

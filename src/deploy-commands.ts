import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const commands = [];

// Grab all the command files
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[VAROITUS] Komennos ${filePath} puuttuu "data" tai "execute" -ominaisuus.`
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

// Deploy commands
(async () => {
  try {
    console.log(`Alotetaa ${commands.length} slash-komennon päivittäminen.`);

    // Register commands globally (takes up to an hour)
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );

    console.log(
      `Onnistuttii päivittää ${(data as any).length} slash-komentoo.`
    );
  } catch (error) {
    console.error(error);
  }
})();

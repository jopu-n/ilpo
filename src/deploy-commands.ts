import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const commands = [];

/**
 * Recursively get all command files from a directory
 */
function getCommandFiles(dir: string): string[] {
  let files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      files = files.concat(getCommandFiles(fullPath));
    } else if (item.endsWith(".ts")) {
      // Add TypeScript files
      files.push(fullPath);
    }
  }

  return files;
}

// Grab all the command files recursively
const commandsPath = path.join(__dirname, "commands");
const commandFiles = getCommandFiles(commandsPath);

console.log(`Found ${commandFiles.length} command files:`);
commandFiles.forEach((file) =>
  console.log(`  - ${path.relative(__dirname, file)}`)
);

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const filePath of commandFiles) {
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
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
    console.log(`\nAlotetaa ${commands.length} slash-komennon päivittäminen.`);

    // Register commands globally (takes up to an hour)
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );

    console.log(
      `✅ Onnistuttii päivittää ${(data as any).length} slash-komentoo.`
    );

    // List deployed commands
    console.log("\nDeployed commands:");
    commands.forEach((cmd: any) =>
      console.log(`  - /${cmd.name}: ${cmd.description}`)
    );
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
})();

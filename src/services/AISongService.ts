import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export interface SongGenerationResult {
  success: boolean;
  songName?: string;
  usedDescription?: string;
  error?: string;
}

export class AISongService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });
  }

  /**
   * Read lines from a text file and return as array
   */
  private readLinesFromFile(filename: string): string[] {
    try {
      const filePath = path.join(__dirname, "..", "..", "resources", filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return fileContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return [];
    }
  }

  /**
   * Get random element from array
   */
  private getRandomElement(array: string[]): string {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate random song description from text files
   */
  private generateRandomDescription(): string {
    const adjectives = this.readLinesFromFile("adjectives.txt");
    const genres = this.readLinesFromFile("genres.txt");
    const popularity = this.readLinesFromFile("popularity.txt");
    const moods = this.readLinesFromFile("moods.txt");

    // Generate random combinations
    const descriptions = [];

    // Add mood and adjective combination
    if (moods.length > 0 && adjectives.length > 0) {
      descriptions.push(
        `${this.getRandomElement(moods)} and ${this.getRandomElement(
          adjectives
        )}`
      );
    }

    // Add genre (now includes both main genres and subgenres)
    if (genres.length > 0) {
      descriptions.push(this.getRandomElement(genres));
    }

    // Add popularity level
    if (popularity.length > 0) {
      descriptions.push(`by a ${this.getRandomElement(popularity)} artist`);
    }

    // Add another adjective for texture
    if (adjectives.length > 0) {
      descriptions.push(`with a ${this.getRandomElement(adjectives)} vibe`);
    }

    // Sometimes add an extra mood descriptor
    if (moods.length > 0 && Math.random() > 0.4) {
      descriptions.push(`that feels ${this.getRandomElement(moods)}`);
    }

    return descriptions.join(", ");
  }

  /**
   * Generate song suggestion using Gemini AI
   */
  public async generateSong(
    userDescription?: string
  ): Promise<SongGenerationResult> {
    try {
      // Use provided description or generate random one
      const description =
        userDescription?.trim() || this.generateRandomDescription();

      if (!description) {
        return {
          success: false,
          error:
            "No description provided and failed to generate random description",
        };
      }

      console.log(`Generating song for description: "${description}"`);

      // Create the prompt
      const prompt = `You are a music recommendation AI. I will give you a description of a song, and you must respond with ONLY the name of one real song that matches the description. Your response must be EXACTLY the song name and nothing else - no explanations, no "here's a song", no additional text, no quotes, no formatting. Just the song name.

The song can be famous, semi-famous, or relatively unknown, but it must be a real song that exists. Pick something that fits the description well. Even though there would be no song to match the description exactly, you must still come up something that is at least kind of close. Response with a format: "Artist Name - Song Name"

Description: ${description}

Song name:`;

      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const songName = response.text().trim();

      // Validate response
      if (!songName || songName.length === 0) {
        return {
          success: false,
          error: "AI returned empty response",
        };
      }

      // Clean up the response (remove any extra formatting)
      const cleanSongName = songName
        .replace(/^["']|["']$/g, "") // Remove quotes
        .replace(/^\*\*|\*\*$/g, "") // Remove bold markdown
        .replace(/^- |^\* /, "") // Remove list formatting
        .trim();

      console.log(`AI suggested song: "${cleanSongName}"`);

      return {
        success: true,
        songName: cleanSongName,
        usedDescription: description,
      };
    } catch (error) {
      console.error("Error generating song with AI:", error);
      return {
        success: false,
        error: `AI error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Test method to generate and print random descriptions
   */
  public generateTestDescriptions(count: number = 5): string[] {
    const descriptions = [];
    for (let i = 0; i < count; i++) {
      descriptions.push(this.generateRandomDescription());
    }
    return descriptions;
  }
}

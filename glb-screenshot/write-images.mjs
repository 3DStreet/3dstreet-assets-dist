import * as fs from "fs";
import sharp from "sharp";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("input", {
    alias: "i",
    description: "Input json",
    type: "string",
  })
  .demandOption(["input"], "Please provide the json file")
  .help().argv;

// Writes the exported images from the web app to the local filesystem
async function saveImageFromBase64(imageData, outputPath) {
  try {
    const base64Data = imageData.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");
    
    // Determine format from the output path extension
    const format = outputPath.split('.').pop().toLowerCase();
    
    if (format === 'webp') {
      await sharp(buffer).webp().toFile(outputPath);
    } else if (format === 'jpeg' || format === 'jpg') {
      await sharp(buffer).jpeg().toFile(outputPath);
    } else {
      // Default to webp if format is unknown
      await sharp(buffer).webp().toFile(outputPath);
    }
    
    console.log(`Image saved to ${outputPath}`);
  } catch (error) {
    console.error("Error saving image:", error);
  }
}

async function processImages(jsonFilePath) {
  try {
    const data = fs.readFileSync(jsonFilePath, "utf8");
    const jsonArray = JSON.parse(data);

    for (const item of jsonArray) {
      const { image, filepath } = item;
      await saveImageFromBase64(image, filepath);
    }
  } catch (error) {
    console.error("Error processing JSON file:", error);
  }
}

processImages(argv.input);

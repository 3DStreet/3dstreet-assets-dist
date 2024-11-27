import { fs } from "fs";
import { sharp } from "sharp";

async function saveImageFromBase64(imageData, outputPath) {
  try {
    const base64Data = imageData.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");
    await sharp(buffer)
      .jpeg() // Convert to JPEG
      .toFile(outputPath);
    console.log(`Image saved to ${outputPath}`);
  } catch (error) {
    console.error("Error saving image:", error);
  }
}

// Function to process the JSON file
async function processImages(jsonFilePath) {
  try {
    // Read the JSON file
    const data = fs.readFileSync(jsonFilePath, "utf8");
    const jsonArray = JSON.parse(data);

    // Process each item in the JSON array
    for (const item of jsonArray) {
      const { image, filepath } = item;
      await saveImageFromBase64(image, filepath);
    }
  } catch (error) {
    console.error("Error processing JSON file:", error);
  }
}

// Example usage
const jsonFilePath = "path/to/your/file.json"; // Specify your JSON file path here
processImages(jsonFilePath);

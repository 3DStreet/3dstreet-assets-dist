import { glob } from "glob";
import { writeFile } from "fs/promises";

// Creates a json file that is just the list of all glb files for the web app to read
const paths = await glob("**/*.glb", { cwd: process.cwd() });
const jsonContent = JSON.stringify(paths, null, 2);
await writeFile("glb-screenshot/paths.json", jsonContent, "utf8");

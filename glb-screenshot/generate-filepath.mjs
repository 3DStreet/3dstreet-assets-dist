import { glob } from "glob";
import { writeFile } from "fs/promises";

const paths = await glob("**/*.glb", { cwd: process.cwd() });
const jsonContent = JSON.stringify(paths, null, 2);
await writeFile("glb-screenshot/paths.json", jsonContent, "utf8");

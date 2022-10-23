import { readdir } from "node:fs/promises";
import { extname } from "path";
import { exec } from "child_process";
import { join } from "node:path";

const testFolder = "../objects/";

const deepReadDir = async (dirPath) =>
  await Promise.all(
    (
      await readdir(dirPath, { withFileTypes: true })
    ).map(async (dirent) => {
      const path = join(dirPath, dirent.name);
      return dirent.isDirectory() ? await deepReadDir(path) : path;
    })
  );

let gltfpack = async function (file) {
  if (extname(file) == ".glb") {
    console.log(file);
    exec(`gltfpack -i ${file} -o ${file} -cc -kn`);
  }
};

let runOnEachGlb = async function () {
  let files = await deepReadDir(testFolder);
  files = files.flat(Number.POSITIVE_INFINITY);
  await Promise.all(
    files.map(async (file) => {
      gltfpack(file);
    })
  );
};

runOnEachGlb();

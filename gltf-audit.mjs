import { writeFile } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SingleBar, Presets } from 'cli-progress';
import { glob } from 'glob';
import pLimit from 'p-limit';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspect } from '@gltf-transform/functions';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
    .option('input', {
        alias: 'i',
        description: 'Input directory path',
        type: 'string',
    })
    .help()
    .argv;

// Use the provided directory or default to the workspace path
const targetDirectory = argv.input ? resolve(argv.input) : dirname(fileURLToPath(import.meta.url));

// Configure glTF I/O.
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'draco3d.encoder': await draco3d.createEncoderModule(),
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });

// Set up search on project directory.

const limit = pLimit(4); // process up to 4 models at a time.
const workspacePath = dirname(fileURLToPath(import.meta.url));
const paths = await glob(resolve(targetDirectory, '**/*.{glb,gltf}'));

const documentPromises = paths.map((path) => limit(async () => {
    return [path, await io.read(path)];
}));

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

// Iterate over all models and create report.

const reportData = [];

for await (const [path, document] of documentPromises) {
    const report = inspect(document);
    const entry = {
		name: basename(path, extname(path)), // Gets the basename without extension
		src: path.substring(workspacePath.length + 1), // source gltf file path relative to current directory
        // nodes: document.getRoot().listNodes().length,
        // meshes: sum(report.meshes, 'primitives'),
        // materials: document.getRoot().listMaterials().length,
        // vertices: sum(report.meshes, 'vertices'),
        // keyframes: sum(report.animations, 'keyframes'),
        bboxMin: report.scenes.properties[0].bboxMin,
        bboxMax: report.scenes.properties[0].bboxMax,
    };
    reportData.push(entry);
    bar.increment();
}

bar.stop();

// Write output

console.log('🗄️  Writing catalog.json...');

await writeFile(resolve(workspacePath, 'catalog.json'), JSON.stringify(reportData, null, 2));

console.log('🍻  Done!');

//////////// Utilities ////////////

function sum(report, key) {
    let sum = 0;
    for (const prop of report.properties) {
        sum += prop[key];
    }
    return sum;
}
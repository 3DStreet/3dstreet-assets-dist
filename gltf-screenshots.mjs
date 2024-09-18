import { resolve, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SingleBar, Presets } from 'cli-progress';
import { glob } from 'glob';
import pLimit from 'p-limit';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { readFile, writeFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
    .option('input', {
        alias: 'i',
        description: 'Input directory path',
        type: 'string',
    })
    .option('output', {
        alias: 'o',
        description: 'Output directory path',
        type: 'string',
    })
    .option('update', {
        alias: 'u',
        description: 'Update catalog.json with new paths',
        type: 'boolean',
    })
    .demandOption(['input', 'output'], 'Please provide both input and output paths')
    .help()
    .argv;

// Configure glTF I/O.
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
    .setLogger(new Logger(Logger.Verbosity.WARN))
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'draco3d.encoder': await draco3d.createEncoderModule(),
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });

let auditData = [];

// Check if the update flag is provided and read the existing catalog.json
if (argv.update) {
    try {
        const rawAudit = await readFile('catalog.json', 'utf8');
        auditData = JSON.parse(rawAudit);
    } catch (error) {
        console.error("Failed to read catalog.json. Make sure the file exists.");
        process.exit(1);
    }
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            // if (error) {
            //     reject(error);
            //     return;
            // }
            resolve(stdout);
        });
    });
}

// Set up search on the input directory provided.
const limit = pLimit(4);
const inputDir = resolve(argv.input);  // Use provided input directory
const paths = (await glob(resolve(inputDir, '**/*.glb')))
const workspacePath = dirname(fileURLToPath(import.meta.url));

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

// ensure output path exists, create it if not
!existsSync(argv.output) && mkdirSync(argv.output, { recursive: true })

console.log('📸  Taking screenshots...');

// Iterate over all models and process.
await Promise.all(paths.map((path) => limit(async () => {
    const document = await io.read(path);

    const screenshotName = parse(path).name + '.jpg';
    await runCommand(`screenshot-glb -i ${path} -o ${resolve(argv.output, screenshotName)} -w 320 -h 240 -c gray`);
    //   -w, --width    Output image width
    //  -h, --height   Output image height
    //  -c, --color    Change the background color of the rendered image
    if (argv.update) {
        const name = parse(path).name;
        const entryIndex = auditData.findIndex(entry => {
            return parse(entry.src).name === name;
        });
        if (entryIndex !== -1) {
            auditData[entryIndex].img = resolve(argv.output, name + '.jpg').substring(workspacePath.length + 1);
        }
    }

    bar.increment();
})));

if (argv.update) {
    await writeFile('catalog.json', JSON.stringify(auditData, null, 2));
}

bar.stop();

console.log('🍻  Done!');

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
    .demandOption(['input'], 'Please provide an input path')
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
function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(`npx ${command}`, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                return;
            }
            resolve(stdout);
        });
    });
}

// Set up search on the input directory provided.
const limit = pLimit(4);
const inputDir = resolve(argv.input);  // Use provided input directory
const paths = (await glob(resolve(inputDir, '**/*.glb')))

console.log('📸  Taking screenshots...');

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

// Iterate over all models and process.
await Promise.all(paths.map((path) => limit(async () => {
    const screenshotName = parse(path).name + '.jpg';
    try {
        await runCommand(`screenshot-glb -i ${path} -o ${resolve(argv.input, screenshotName)} -w 320 -h 240 -c gray`);
    } catch (error) {
        console.error(error);
    }
    bar.increment();
})));

if (argv.update) {
    await writeFile('catalog.json', JSON.stringify(auditData, null, 2));
}

bar.stop();

console.log('🍻  Done!');

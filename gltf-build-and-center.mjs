import { resolve, parse } from 'node:path';
import { SingleBar, Presets } from 'cli-progress';
import { glob } from 'glob';
import pLimit from 'p-limit';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, dequantize, join, weld, resample, prune, sparse, draco, center } from '@gltf-transform/functions';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { existsSync, mkdirSync } from 'node:fs';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
    .option('input', {
        alias: 'i',
        description: 'Input directory or file path',
        type: 'string',
        demandOption: true,
    })
    .option('output', {
        alias: 'o',
        description: 'Output directory path (optional, will use input dir if not provided)',
        type: 'string',
    })
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

// Set up search on the input path provided
const limit = pLimit(4);
const inputArg = Array.isArray(argv.input) ? argv.input[argv.input.length - 1] : argv.input;
const inputPath = resolve(inputArg);
const isDirectory = existsSync(inputPath) && !inputPath.match(/\.(glb|gltf)$/i);
const paths = isDirectory
    ? await glob(resolve(inputPath, '**/*.{glb,gltf}'))
    : [inputPath];

const outputDir = argv.output ? resolve(argv.output) : inputPath;

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

console.log('🗜️  Building and centering models...');

// Iterate over all models and process
await Promise.all(paths.map((path) => limit(async () => {
    const document = await io.read(path);

    // First optimize and flatten the model
    await document.transform(
        dedup(),
        flatten(),      // Flatten hierarchy - combines layers
        dequantize(),
        join(),         // Join compatible primitives
        weld(),
        resample(),
        prune({ keepAttributes: false, keepLeaves: false }),
        sparse(),
        draco()
    );

    // Then center it (now that it's flattened, this should work correctly)
    await document.transform(
        center({ pivot: 'below' })  // Centers X/Z, places bottom at Y=0
    );

    const name = parse(path).name + '-centered.glb';
    const outputPath = resolve(outputDir, name);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    await io.write(outputPath, document);

    bar.increment();
})));

bar.stop();

console.log('🍻 Done!');

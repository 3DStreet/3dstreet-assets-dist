import { resolve, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SingleBar,Presets } from 'cli-progress';
import { glob } from 'glob';
import pLimit from 'p-limit';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, dequantize, join, weld, resample, prune, sparse, draco } from '@gltf-transform/functions';

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

// Set up search on project directory.

const limit = pLimit(4); // process up to 4 models at a time.
const workspacePath = dirname(fileURLToPath(import.meta.url));
const paths = (await glob(resolve(workspacePath, '**/*.{glb,gltf}')))
	.filter((path) => !parse(path).name.endsWith('_opt'));

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

// Iterate over all models and process.

await Promise.all(paths.map((path) => limit(async () => {
	const document = await io.read(path);

	await document.transform(
		dedup(),
		flatten(),
		dequantize(),
		join(),
		weld(),
		resample(),
		prune({ keepAttributes: false, keepLeaves: false }),
		sparse(),
		draco()
	);

	const name = parse(path).name + '_opt.glb';
	await io.write(resolve(workspacePath, name), document);

	bar.increment();
})));

bar.stop();

console.log('🍻  Done!');

//////////// Utilities ////////////

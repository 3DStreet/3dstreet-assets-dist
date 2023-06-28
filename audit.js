import { writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SingleBar,Presets } from 'cli-progress';
import { glob } from 'glob';
import pLimit from 'p-limit';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspect } from '@gltf-transform/functions';

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
const paths = await glob(resolve(workspacePath, '**/*.{glb,gltf}'));

const documentPromises = paths.map((path) => limit(async () => {
	return [path, await io.read(path)];
}));

const bar = new SingleBar({}, Presets.shades_classic);
bar.start(paths.length, 0);

// Iterate over all models and create report.

const header = 'name,nodes,meshes,materials,vertices,keyframes';
const reportRows = [];

for await (const [path, document] of documentPromises) {
	const report = inspect(document);
	const name = basename(path);
	const nodes = document.getRoot().listNodes().length;
	const meshes = sum(report.meshes, 'primitives');
	const materials = document.getRoot().listMaterials().length;
	const vertices = sum(report.meshes, 'vertices');
	const keyframes = sum(report.animations, 'keyframes');
	reportRows.push(`${name},${nodes},${meshes},${materials},${vertices},${keyframes}`);
	bar.increment();
}

bar.stop();

// Write output

console.log('🗄️  Writing audit.csv...');

reportRows.sort();
const csvContent = header + '\n' + reportRows.join('\n');
await writeFile(resolve(workspacePath, 'audit.csv'), csvContent);

console.log('🍻  Done!');

//////////// Utilities ////////////

function sum(report, key) {
	let sum = 0;
	for (const prop of report.properties) {
		sum += prop[key];
	}
	return sum;
}
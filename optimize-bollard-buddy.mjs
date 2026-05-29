/**
 * One-off optimizer for the Bollard Buddy catalog set.
 *
 * The standard `gltf-build.mjs` pipeline is geometry-only (Draco), which barely
 * dented these Sketchfab props — they are texture-bound (4096px PBR maps). This
 * mirrors the 3DStreet editor's user-upload pipeline
 * (src/shared/asset-upload/optimizeGlb.worker.js) so first-party catalog assets
 * get the same WebP + resize + Draco treatment a dragged-in GLB would:
 *
 *   dedup → instance → flatten → join → weld → resample → prune → sparse →
 *   palette → textureCompress(webp, q85, 1024) → draco(edgebreaker)
 *
 * Textures are capped at 1024px (vs the editor's 2048): these are small street
 * props usually viewed at a distance in a street scene, so 1024 is plenty and
 * roughly quarters the texture byte count.
 *
 * Usage (from repo root):
 *   node optimize-bollard-buddy.mjs <input-glb-dir>
 *
 * Reads raw GLBs from <input-glb-dir> (default: the iOS repo's ./glb output)
 * and writes optimized GLBs into the catalog set dir.
 */
import { resolve, parse } from 'node:path';
import { mkdirSync, statSync } from 'node:fs';
import { glob } from 'glob';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  instance,
  flatten,
  join,
  weld,
  resample,
  prune,
  sparse,
  palette,
  textureCompress,
  draco
} from '@gltf-transform/functions';
import sharp from 'sharp';

const IN_DIR =
  process.argv[2] ||
  resolve(process.env.HOME, 'dev/bollard-buddy-ios/glb');
const SET_DIR = 'sets/bollard-buddy/gltf-exports/draco';
mkdirSync(resolve(SET_DIR), { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder
  });

const paths = await glob(resolve(IN_DIR, '*.glb'));
console.log(`Optimizing ${paths.length} GLBs from ${IN_DIR}\n  -> ${SET_DIR}\n`);

let totalBefore = 0;
let totalAfter = 0;
for (const path of paths) {
  const name = parse(path).name;
  const before = statSync(path).size;
  const document = await io.read(path);
  await document.transform(
    dedup(),
    instance(),
    flatten(),
    join(),
    weld(),
    resample(),
    prune(),
    sparse(),
    palette({ min: 5 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [1024, 1024] }),
    draco({ method: 'edgebreaker' })
  );
  const outPath = resolve(SET_DIR, name + '.glb');
  await io.write(outPath, document);
  const after = statSync(outPath).size;
  totalBefore += before;
  totalAfter += after;
  const pct = Math.round((1 - after / before) * 100);
  console.log(
    `${name.padEnd(28)} ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB  (-${pct}%)`
  );
}
console.log(
  `\nTotal ${(totalBefore / 1e6).toFixed(1)} MB -> ${(totalAfter / 1e6).toFixed(1)} MB  (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`
);
console.log('Done.');

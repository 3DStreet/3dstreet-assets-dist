# 3dstreet-assets-dist
Distribution repo for 3DStreet assets for use by first and third-party clients.

The entirety of this repo is available on this subdomain of 3dstreet.app: https://assets.3dstreet.app/

This repo includes a few different utils for processing glb/gltf files to prepare them for use in 3DStreet.

## Web-based gltf/glb thumbnail generation utility

This is the easiest way to create thumbnails for glb files using a browser interface:
1. Ensure that the prerequisite packages are installed via `npm i`
2. Start the utility by running `npm start`.
2. Generate the desired screenshots of the models/parts. (Instructions are included in the web app.)
3. Download the screenshots.

## CLI gtlf/glb processing tools
These command line interface glb processing utilities are separate from the web-based tool, choose whichever works best for your needs. These tools are handy if you want to create and automated pipeline.

- `npm run gltf:audit` - Audits GLB/GLTF models in ./src/models and generates (or overwrites) a catalog.json file with the results
- `npm run gltf:build` - Processes and optimizes GLB/GLTF models from ./src/models to ./dist/models (with Draco compression)
- `npm run gltf:screenshots` - Generates screenshots from processed models in ./dist/models and outputs to ./dist/img
- `npm run gltf:pipeline` - Runs the complete pipeline: audit, build, and screenshot generation in sequence
- `npm run gltf:center -- <PATH>` - Optimizes (flattens hierarchy, combines meshes) and centers the origin of GLB/GLTF models on horizontal axes (X/Z) with bottom at ground level (Y=0). Use `-i <path>` for input and optionally `-o <path>` for output. Output files are saved with `-centered` suffix

# End-User License for Use of 3D Assets

If you wish to use assets from this library, these are made available to users through CC BY-SA 4.0 License.

## Attribution-NonCommercial-ShareAlike 4.0 International

Unless specified otherwise, all assets in this repo are covered by the CC BY-SA 4.0 License.

This is a human-readable summary of (and not a substitute for) the [full license](LICENSE).

You are free to:
* Share — copy and redistribute the material in any medium or format
* Adapt — remix, transform, and build upon the material

Under the following terms:
* Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
* Non-Commercial — You may not use the material for commercial purposes.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

Please contact kieran@3dstreet.org for other licensing options.

# License Grant for Contributors
Contributions are welcome to this repo under the following terms. Submitting PRs to this repo are an acknowledgement and agreement to these terms:

By contributing assets to 3DStreet LLC (3DStreet), the Contributor:

a) Retains full ownership of their Contributed Assets

b) Grants to 3DStreet and its successors a worldwide, non-exclusive, perpetual, irrevocable, royalty-free, fully-paid, sublicensable, and transferable license to:

* Use, reproduce, modify, adapt, publish, translate, and distribute the Contributed Assets
* Create derivative works based on the Contributed Assets
* Include the Contributed Assets in the 3DStreet application and related services
* License or sublicense the Contributed Assets to third parties
* Exercise all rights in any medium now known or later developed
* Use the Contributed Assets for any purpose, whether commercial or non-commercial

c) Warrants that they have the legal right to grant such license and that the Contributed Assets do not infringe upon any third-party intellectual property rights

d) It is at the sole discretion of 3DStreet staff as to which objects, textures, or code we may choose to integrate into the 3DStreet application.

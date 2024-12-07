# 3dstreet-assets-dist
Distribution repo for 3DStreet assets for use by first and third-party clients.

The entirety of this repo is available on this subdomain of 3dstreet.app: https://assets.3dstreet.app/

# License CC BY-SA 4.0
Attribution-NonCommercial-ShareAlike 4.0 International

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

# Generating screenshots using glb-screenshot utility

The `glb-screenshot` is a simple web app used for generating screenshots part-by-part for meshes grouped in the `.glb` file format. 

## Usage

> Ensure that the prerequisite packages are installed via `npm i`

1. Start the utlity by running `npm run glb:util`.
2. Generate the desired screenshots of the models/parts. Instructions are included in the web app.
3. Download the screenshot data.
4. Find the location of the screenshot data (titled `scene.json`) and write it to the local filesystem with `npm run glb:write <PATH_TO_SCENE_JSON>`. This will write the images to the local filesystem.
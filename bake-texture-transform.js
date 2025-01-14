const { NodeIO } = require('@gltf-transform/core');
const { KHRTextureTransform } = require('@gltf-transform/extensions');
const { dedup, prune, resample } = require('@gltf-transform/functions');
const { vec3, mat3 } = require('gl-matrix');
const path = require('path');

async function transformUVs(inputPath, outputPath) {
    try {
        // Initialize IO with extension
        const io = new NodeIO().registerExtensions([KHRTextureTransform]);

        console.log(`Reading input file: ${inputPath}`);
        const document = await io.read(inputPath);
        
        // Document-level extension checks
        const root = document.getRoot();

        const matrixMap = new Map();

        // Compute UV transform matrix for each material's base color texture
        for (const material of root.listMaterials()) {
            const info = material.getBaseColorTextureInfo();
            const transform = info?.getExtension('KHR_texture_transform');
            if (!transform) continue;
            
            const matrix = mat3.create();
            mat3.translate(matrix, matrix, transform.getOffset() || [0, 0]);
            mat3.rotate(matrix, matrix, -(transform.getRotation() || 0));
            mat3.scale(matrix, matrix, transform.getScale() || [1, 1]);    
            matrixMap.set(material, matrix);
        }

        // Transform UVs
        for (const mesh of root.listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                const material = prim.getMaterial();
                if (!material) continue;
                
                const matrix = matrixMap.get(material);
                if (!matrix) continue;
                
                const uvAttribute = prim.getAttribute('TEXCOORD_0');
                if (!uvAttribute) continue;

                const uv = uvAttribute.clone();
                for (let i = 0, el = [0, 0, 1], il = uv.getCount(); i < il; i++) {
                    uv.getElement(i, el);
                    vec3.transformMat3(el, el, matrix);
                    uv.setElement(i, el);
                }
                prim.setAttribute('TEXCOORD_0', uv);
            }
        }

        // Remove KHR_texture_transform extension
        for (const extension of root.listExtensionsUsed()) {
            if (extension.extensionName === 'KHR_texture_transform') {
                extension.dispose();
            }
        }

        // Optimize the document
        console.log('\nOptimizing document...');
        await document.transform(
            // dedup(),   // Remove duplicate resources
            // prune(),   // Remove unused resources
            // resample() // Resample animations and reduce keyframes
        );

        console.log(`Writing output file: ${outputPath}`);
        await io.write(outputPath, document);
        console.log('Conversion complete!');

    } catch (error) {
        console.error('Error processing GLTF file:', error);
        throw error;
    }
}

// CLI interface
async function main() {
    if (process.argv.length !== 4) {
        console.error('Usage: node script.js <input-path> <output-path>');
        process.exit(1);
    }

    const inputPath = path.resolve(process.argv[2]);
    const outputPath = path.resolve(process.argv[3]);

    try {
        await transformUVs(inputPath, outputPath);
    } catch (error) {
        console.error('Error during conversion:', error);
        process.exit(1);
    }
}

main();
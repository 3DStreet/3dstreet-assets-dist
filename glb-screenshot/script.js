import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import paths from "./paths.json" with { type: "json" };

const checklistContainer = document.getElementById("checklist");
paths.forEach((path) => {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = path;
  checkbox.value = path;

  const label = document.createElement("label");
  label.htmlFor = path;
  label.textContent = path;

  const image = document.createElement("img");
  image.className = "preview";
  image.src = "/" + path.replace(".glb", ".jpg");
  image.onerror = () => {
    checkbox.setAttribute("noimage", "");
  };

  const div = document.createElement("div");
  div.appendChild(image);
  div.appendChild(checkbox);
  div.appendChild(label);

  checklistContainer.appendChild(div);
});
document.getElementById("select-all").addEventListener("click", () => {
  document
    .querySelectorAll('#checklist input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = true;
    });
});
document.getElementById("deselect-all").addEventListener("click", () => {
  document
    .querySelectorAll('#checklist input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });
});
document.getElementById("select-noimage").addEventListener("click", () => {
  document
    .querySelectorAll('#checklist input[type="checkbox"][noimage]')
    .forEach((checkbox) => {
      checkbox.checked = true;
    });
});

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: "js" });
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
loader.setDRACOLoader(dracoLoader);
loader.setMeshoptDecoder(MeshoptDecoder);

const partToImage = (part, scene, camera, renderer) => {
  scene.add(part);

  const bbox = new THREE.Box3().setFromObject(part);
  const center = bbox.getCenter(new THREE.Vector3());
  part.position.sub(center);

  // Position the object
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(0, maxDim * 0.1, maxDim * 1.6);

  camera.lookAt(part.position);
  part.position.y -= 0.8;

  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL("image/jpeg");
  scene.remove(part);

  return image;
};

const generateImagesFromGLB = async (
  glbFilePath,
  outputWidth = 340,
  outputHeight = 240
) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(outputWidth, outputHeight);
  renderer.setClearColor("gray", 1);

  const camera = new THREE.PerspectiveCamera(
    45,
    outputWidth / outputHeight,
    0.1,
    100
  );

  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(1, 1, 2);
  scene.add(ambientLight, directionalLight);

  const glb = await loader.loadAsync(glbFilePath);

  console.log(glb);
  const parts = glb.scene.children;
  console.log(parts);
  return parts.map((part) => ({
    filename: glbFilePath,
    image: partToImage(part, scene, camera, renderer),
    name: part.name,
  }));
};

document
  .getElementById("generate-parts")
  .addEventListener("click", async () => {
    const selectedBoxes = Array.from(
      document.querySelectorAll('#checklist input[type="checkbox"]:checked')
    );
    selectedBoxes.forEach(box => {
        box.parentElement.style = "color: #8b8000;"
        const figs = box.parentElement.querySelectorAll('figure')
      figs.forEach(f => box.parentElement.removeChild(f))
    })

    // Call your function with selected paths
    for (const box of selectedBoxes) {
      console.log(box);
      const loader = document.createElement("span");
      loader.className = "loader";
      box.parentElement.appendChild(loader);

      try {
        const results = await generateImagesFromGLB("/" + box.value);
        results.forEach((res) => {
          const fig = document.createElement("figure");
          const img = document.createElement("img");
          img.src = res.image;
          img.className = "output";
          img.setAttribute(
            "name",
            res.name
          );
          const caption = document.createElement("figcaption");
          caption.innerText = res.name;
          fig.appendChild(img);
          fig.appendChild(caption);
          box.parentElement.appendChild(fig);
        });
        box.parentElement.style = "color: green;";
      } catch (error) {
        box.parentElement.append(" --- " + error);
        box.parentElement.style = "color: red;";
      }
      box.parentElement.removeChild(loader);
    }
  });


document
  .getElementById("save")
  .addEventListener("click", async () => {
    const boxes = Array.from(
      document.querySelectorAll('#checklist input[type="checkbox"]:checked')
    );

    const output = boxes.map(box => {
        const images = Array.from(box.parentElement.querySelectorAll('img.output'))
        switch (images.length) {
            // No images, skip
            case 0: return null
            // 1 image, ignore the name and write it as the same name as glb
            case 1: return {
                image: images[0].src,
                name: images[0].name,
                filepath: box.value.replace(".glb", ".jpg")
            }
            // Multiple images, use the glb name as the prefix
            default: return images.map(image => ({
                    image: image.src,
                    name: image.name,
                    filepath: box.value.replace(".glb", "/") + image.name + ".jpg"
                }))
            
        }
    }).filter(f => f)

    // Download the JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(output));
    const dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", "scene.json");
    dlAnchorElem.click();
  });
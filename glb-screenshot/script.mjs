import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import paths from "./paths.json" with { type: "json" };

const DEG_TO_RAD = Math.PI / 180;

// A factor to scale the importance of the z-size of the object when computing its overall scale
const Z_SCALE_FACTOR = 1 / 1.75;
const LIGHTING_COLOR = 0xffffff;
const CAMERA_DIST = 3;

// Create the list of paths
const tableContainer = document.getElementById("table");
paths.forEach((path) => {
  const row = document.createElement("tr");
  row.setAttribute("path", path);

  const checkedColumn = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkedColumn.appendChild(checkbox);
  row.appendChild(checkedColumn);

  const pathColumn = document.createElement("td");
  pathColumn.innerText = path;
  row.appendChild(pathColumn);

  const buttonColumn = document.createElement("td");
  buttonColumn.style = "display: flex; flex-direction: column;";
  const genButton = document.createElement("input");
  genButton.type = "button";
  genButton.value = "Generate";
  genButton.onclick = () => {
    row.querySelectorAll("figure").forEach((f) => f.remove());
    generateRow(row);
  };
  buttonColumn.appendChild(genButton);
  row.appendChild(buttonColumn);
  const removeButton = document.createElement("input");
  removeButton.type = "button";
  removeButton.value = "Remove";
  removeButton.onclick = () => {
    row.querySelectorAll("figure").forEach((f) => f.remove());
  };
  buttonColumn.appendChild(removeButton);

  const figColumn = document.createElement("td");
  figColumn.classList.add("figures");
  row.appendChild(figColumn);

  tableContainer.appendChild(row);
});

// Select-all/none logic
document.getElementById("select-all").onclick = () => {
  document
    .querySelectorAll('#table input[type="checkbox"]')
    .forEach((c) => (c.checked = true));
};

document.getElementById("select-none").onclick = () => {
  document
    .querySelectorAll('#table input[type="checkbox"]')
    .forEach((c) => (c.checked = false));
};

// 3js setup stuff
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: "js" });
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
loader.setDRACOLoader(dracoLoader);
loader.setMeshoptDecoder(MeshoptDecoder);
const renderer = new THREE.WebGLRenderer();

const generateFromGlbPath = async (path, config) => {
  renderer.setSize(config.width, config.height);
  renderer.setClearColor(config.bgColor, 1);

  const camera = new THREE.PerspectiveCamera(
    30,
    config.width / config.height,
    0.1,
    100
  );
  camera.position.set(0, 0, CAMERA_DIST);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(LIGHTING_COLOR, 1);
  const directionalLight = new THREE.DirectionalLight(LIGHTING_COLOR, 4);
  directionalLight.position.set(1, 1, 2);
  scene.add(ambientLight, directionalLight);

  const getImage = (part) => {
    scene.add(part);
    const bbox = new THREE.Box3().setFromObject(part);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z * Z_SCALE_FACTOR);
    part.scale.set(
      config.scale / maxDim,
      config.scale / maxDim,
      config.scale / maxDim
    );
    part.position.set(0, -config.scale / 2, 0);
    part.rotation.y = config.rotation * DEG_TO_RAD;

    renderer.render(scene, camera);
    const image = renderer.domElement.toDataURL("image/jpeg");
    scene.remove(part);
    return image;
  };

  const glb = await loader.loadAsync(path);

  // Why do we need to duplicate this array?
  // Adding a mesh to a scene removes it from its parent scene, resizing the set that glb.scene
  // contains originally. This results in skipping every other part as we iterate through
  // the array, so we must separate obtaining the meshes and using them.
  const parts = [];
  glb.scene.children.forEach((part) => {
    parts.push(part);
  });
  return parts.map((part) => ({
    path: path,
    partName: part.name,
    image: getImage(part),
  }));
};

const getFig = (result) => {
  const fig = document.createElement("figure");
  const parentPath = result.path.split("/").slice(0, -1).join("/") + "/";
  fig.setAttribute("parentPath", parentPath);

  const img = document.createElement("img");
  img.src = result.image;
  img.setAttribute("path", result.path);
  fig.appendChild(img);

  const partName = document.createElement("div");
  partName.className = "partName";
  partName.innerText = result.partName || "unknown";
  fig.appendChild(partName);

  const exportName = document.createElement("input");
  exportName.type = "text";
  exportName.style = "width: 100%; box-sizing: border-box;";
  const filename = result.path.split("/").at(-1).replace(".glb", "");
  exportName.value = filename + "-" + (result.partName || "unknown");
  fig.appendChild(exportName);

  const removeFig = document.createElement("input");
  removeFig.type = "button";
  removeFig.className = "remove";
  removeFig.value = "X";
  removeFig.onclick = () => fig.remove();
  fig.appendChild(removeFig);

  return fig;
};

const generateRow = async (row) => {
  const config = {
    width: document.getElementById("width").value,
    height: document.getElementById("height").value,
    bgColor: document.getElementById("bgColor").value,
    scale: document.getElementById("scale").value / 100,
    rotation: document.getElementById("rotation").value,
  };

  try {
    const results = await generateFromGlbPath(
      "/" + row.getAttribute("path"),
      config
    );

    // Duplicate part names get a postfix
    const partnameCt = {};
    const resultsDeduped = results.map((r) => {
      partnameCt[r.partName]++;
      return {
        ...r,
        partName:
          r.partName +
          (partnameCt[r.partName] > 0 ? `-${partnameCt[r.partName]}` : ""),
      };
    });

    const figs = resultsDeduped.map(getFig);
    const figsContainer = row.querySelector(".figures");
    figs.forEach((f) => figsContainer.append(f));
    row.classList.add("success");
  } catch (err) {
    row.classList.add("err");
    const errDiv = document.createElement("div");
    errDiv.classList.add("err");
    errDiv.innerText = err;
    row.appendChild(errDiv);
    throw err;
  }
};

document.getElementById("generate").onclick = async () => {
  const checked = document.querySelectorAll(
    '#table input[type="checkbox"]:checked'
  );

  const genButtons = document.querySelectorAll("#save, #generate");
  genButtons.forEach((b) => (b.disabled = true));

  // Remove all the old images
  checked.forEach((checkbox) => {
    const row = checkbox.parentElement.parentElement;
    row.className = "generating";
    row.querySelectorAll("figure").forEach((f) => f.remove());
  });

  for (const checkbox of checked) {
    const row = checkbox.parentElement.parentElement;
    await generateRow(row);
    row.classList.remove("generating");
  }

  genButtons.forEach((b) => (b.disabled = false));
};

document.getElementById("save").onclick = async () => {
  const rows = Array.from(document.querySelectorAll("#table tr"));
  const output = rows.reduce((acc, row) => {
    const figs = Array.from(row.querySelectorAll("figure"));

    return acc.concat(
      figs.map((fig) => {
        const parentPath = fig.getAttribute("parentPath");
        const exportName = fig.querySelector('input[type="text"]').value;
        const image = fig.querySelector("img");

        return {
          image: image.src,
          filepath: parentPath + exportName + ".jpg",
        };
      })
    );
  }, []);

  // Download the JSON
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(output));
  const dlAnchorElem = document.getElementById("downloadAnchorElem");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "scene.json");
  dlAnchorElem.click();
};

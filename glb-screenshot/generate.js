import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import paths from "./paths.json" with { type: "json" };

// Create the list of paths
const tableContainer = document.getElementById("table");
paths.forEach((path) => {
  const row = document.createElement("tr");
  row.setAttribute("path", path);

  const col0 = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  col0.appendChild(checkbox);
  row.appendChild(col0);

  // The second-level folder (i.e. objects/) is the category
  const col1 = document.createElement("td")
  const category = document.createElement("input")
  category.type = "text"
  category.value = path.split("/").at(1)
  col1.appendChild(category)
  row.appendChild(col1)

  const col2 = document.createElement("td");
  col2.innerText = path;
  row.appendChild(col2);

  const col3 = document.createElement("td");
  col3.style = "display: flex; flex-direction: column;";
  const genButton = document.createElement("input");
  genButton.type = "button";
  genButton.value = "Generate";
  genButton.onclick = () => {
    row.querySelectorAll("figure").forEach((f) => f.remove());
    generateRow(row);
  };
  col3.appendChild(genButton);
  row.appendChild(col3);
  const removeButton = document.createElement("input");
  removeButton.type = "button";
  removeButton.value = "Remove";
  removeButton.onclick = () => {
    row.querySelectorAll("figure").forEach((f) => f.remove());
  };
  col3.appendChild(removeButton);

  const col4 = document.createElement("td");
  col4.classList.add("figures");
  row.appendChild(col4);

  tableContainer.appendChild(row);
});

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

const generateFromGlbPath = async (path, config) => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(config.width, config.height);
  renderer.setClearColor(config.bgColor, 1);

  const camera = new THREE.PerspectiveCamera(
    30,
    config.width / config.height,
    0.1,
    100
  );

  console.log(config);

  const scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(1, 1, 2);
  scene.add(ambientLight, directionalLight);

  const getImage = (part) => {
    scene.add(part);
    // Position the object
    const bbox = new THREE.Box3().setFromObject(part);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z / 1.75);
    part.scale.set(
      config.scale / maxDim,
      config.scale / maxDim,
      config.scale / maxDim
    );
    part.position.set(0, -config.scale / 2, 0);
    part.rotation.y = config.rotation * 180 / Math.PI;

    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    const image = renderer.domElement.toDataURL("image/jpeg");
    scene.remove(part);
    return image;
  };

  const glb = await loader.loadAsync(path);
  const parts = glb.scene.children;
  return parts.map((part) => ({
    path: path,
    partName: part.name,
    image: getImage(part),
  }));
};

const getFig = (result) => {
  const fig = document.createElement("figure");

  const img = document.createElement("img");
  img.src = result.image;
  img.setAttribute("path", result.path);
  img.setAttribute("partName", result.partName);
  fig.appendChild(img);

  const caption = document.createElement("figcaption");
  caption.innerText = result.partName || "<NO NAME>";
  fig.appendChild(caption);

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
    const figs = results.map(getFig);
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
  row.classList.remove("generating");
};

document.getElementById("generate").onclick = async () => {
  const checked = document.querySelectorAll(
    '#table input[type="checkbox"]:checked'
  );

  // Remove all the old images
  checked.forEach((checkbox) => {
    const row = checkbox.parentElement.parentElement;
    row.className = "generating";
    row.querySelectorAll("figure").forEach((f) => f.remove());
  });

  for (const checkbox of checked) {
    const row = checkbox.parentElement.parentElement;
    await generateRow(row);
  }
};


    // {
    //     "id": "sedan-rig",
    //     "name": "Sedan",
    //     "src": "https://assets.3dstreet.app/sets/vehicles-rig/gltf-exports/draco/toyota-prius-rig.glb",
    //     "img": "https://assets.3dstreet.app/sets/vehicles-rig/gltf-exports/draco/toyota-prius-rig.jpg",
    //     "category": "vehicles-rigged"
    // },

document.getElementById("save").onclick = async () => {
  const rows = Array.from(document.querySelectorAll("#table tr"));

  console.log(rows);

  const output = rows.reduce((acc, row) => {
    console.log(acc);
    const images = Array.from(row.querySelectorAll("img"));
    return acc.concat(
          images.map((image) => ({
            image: image.src,
            filepath:
              image.getAttribute("partName") ? row.getAttribute("path").replace(".glb", "-") +
              image.getAttribute("partName") +
              ".jpg" : row.getAttribute("path").replace(".glb", ".jpg"),
          }))
        )
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

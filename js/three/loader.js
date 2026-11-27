import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Utility function to load Blender exported .glb or .gltf PipBoy 3000 models.
 * Automatically centers the model at origin and computes bounding box scaling.
 * 
 * @param {string} url - Path to the .glb / .gltf file
 * @param {Function} onProgress - Optional callback for loading progress (0-100%)
 * @returns {Promise<THREE.Group>} Loaded & centered GLTF scene model
 */
export function loadGLTFModel(url, onProgress = null) {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // Traverse model meshes to enable shadow casting & receiving
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Ensure materials respond well to lighting and render with metallic Vault-Tec armor texture
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              if (child.name !== 'PipBoyPhysical3DScreen') {
                if (!child.material.map) {
                  child.material.color.set(0x3a483a);
                }
                child.material.roughness = 0.35;
                child.material.metalness = 0.6;
              }
            }
          }
        });

        // Calculate Bounding Box to Center and Normalize Scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center Model at Origin (0,0,0)
        model.position.x -= center.x;
        model.position.y -= center.y;
        model.position.z -= center.z;

        // Scale Model to fit normalized viewport (~2.5 units max dimension)
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const targetScale = 2.5 / maxDim;
          model.scale.set(targetScale, targetScale, targetScale);
        }

        // Wrap in parent container group so rotation & positioning are clean
        const containerGroup = new THREE.Group();
        containerGroup.add(model);
        containerGroup.userData.gltfScene = model;

        resolve(containerGroup);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

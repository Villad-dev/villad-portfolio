import * as THREE from 'three';

/**
 * Creates a stylized Pip-Boy 3000 3D mesh representation 
 * featuring a CRT retro-green screen, rugged body armor casing,
 * control knobs, and glowing display elements.
 * 
 * @returns {THREE.Group} Pip-Boy 3000 3D Group
 */
export function createPipBoy3000Mesh() {
  const pipboyGroup = new THREE.Group();

  // Materials
  const armorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b332b, // Olive olive-drab wasteland casing
    roughness: 0.5,
    metalness: 0.6,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0x889988,
    roughness: 0.2,
    metalness: 0.9,
  });

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x051a05,
    emissive: 0x10ff10,
    emissiveIntensity: 0.6,
    roughness: 0.1,
  });

  const knobMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.3,
    metalness: 0.8,
  });

  // 1. Main Wrist Casing (Rugged Outer Shell)
  const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 1.6);
  const bodyMesh = new THREE.Mesh(bodyGeo, armorMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  pipboyGroup.add(bodyMesh);

  // 2. CRT Screen Housing Bezel
  const screenBezelGeo = new THREE.BoxGeometry(1.5, 1.2, 0.2);
  const screenBezelMesh = new THREE.Mesh(screenBezelGeo, armorMaterial);
  screenBezelMesh.position.set(-0.3, 0.1, 0.85);
  screenBezelMesh.castShadow = true;
  pipboyGroup.add(screenBezelMesh);

  // 3. Glowing Green Screen Display
  const screenGeo = new THREE.PlaneGeometry(1.3, 1.0);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(-0.3, 0.1, 0.96);
  pipboyGroup.add(screenMesh);

  // 4. Control Knobs (Tuner & Mode Selectors)
  const knobGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16);

  const knob1 = new THREE.Mesh(knobGeo, knobMaterial);
  knob1.rotation.x = Math.PI / 2;
  knob1.position.set(0.8, 0.5, 0.8);
  pipboyGroup.add(knob1);

  const knob2 = new THREE.Mesh(knobGeo, knobMaterial);
  knob2.rotation.x = Math.PI / 2;
  knob2.position.set(0.8, 0.0, 0.8);
  pipboyGroup.add(knob2);

  const knob3 = new THREE.Mesh(knobGeo, knobMaterial);
  knob3.rotation.x = Math.PI / 2;
  knob3.position.set(0.8, -0.5, 0.8);
  pipboyGroup.add(knob3);

  // 5. Metal Fasteners / Clasps
  const claspGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12);
  const claspMesh = new THREE.Mesh(claspGeo, chromeMaterial);
  claspMesh.rotation.z = Math.PI / 2;
  claspMesh.position.set(0, -0.85, 0);
  pipboyGroup.add(claspMesh);

  // Add subtle green point light to illuminate surrounding area
  const screenLight = new THREE.PointLight(0x10ff10, 2, 4);
  screenLight.position.set(-0.3, 0.1, 1.2);
  pipboyGroup.add(screenLight);

  return pipboyGroup;
}

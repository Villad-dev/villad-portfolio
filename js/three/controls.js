import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go far below ground
  controls.minDistance = 0.1;
  controls.maxDistance = 20;

  return controls;
}

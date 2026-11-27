import * as THREE from 'three';

export class LightingManager {
  constructor(scene) {
    this.scene = scene;
    this.ambientLight = null;
    this.directionalLight = null;
    this.fillLight = null;
    this.accentLight = null;

    this._initLights();
  }

  _initLights() {
    // 1. Warm Ambient Light for overall model visibility
    this.ambientLight = new THREE.AmbientLight(0xdfe6e6, 2.2);
    this.scene.add(this.ambientLight);

    // 2. Key Directional Light with crisp shadows
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 3.5);
    this.directionalLight.position.set(6, 10, 8);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 25;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    // 3. Front Fill Light to illuminate front armor textures
    this.fillLight = new THREE.DirectionalLight(0xb0c4de, 2.0);
    this.fillLight.position.set(-6, 4, 8);
    this.scene.add(this.fillLight);

    // 4. Phosphor Rim Point Light (toned down for softer glow)
    this.accentLight = new THREE.PointLight(0x10ff10, 1.5, 18);
    this.accentLight.position.set(-4, -2, 4);
    this.scene.add(this.accentLight);
  }

  setLightColor(keyHex, accentHex) {
    if (this.directionalLight) this.directionalLight.color.set(keyHex);
    if (this.accentLight) this.accentLight.color.set(accentHex);
  }
}

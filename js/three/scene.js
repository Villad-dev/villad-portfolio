import * as THREE from 'three';

export class SceneManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id #${canvasId} not found.`);
    }

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.updateCallbacks = [];

    this._initCamera();
    this._initRenderer();
    this._addResizeListener();
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      0.05,
      1000
    );
    this.camera.position.set(0, 1.5, 5.5);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x080c10, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.6;
  }

  _addResizeListener() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  startRenderLoop() {
    const tick = () => {
      const delta = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      // Trigger all registered update callbacks
      this.updateCallbacks.forEach(cb => cb(delta, elapsedTime));

      // Render Scene
      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(tick);
    };

    tick();
  }
}

import * as THREE from 'three';
import { SceneManager } from './three/scene.js';
import { LightingManager } from './three/lighting.js';
import { setupControls } from './three/controls.js';
import { loadGLTFModel } from './three/loader.js';
import { createPipBoy3000Mesh } from './utils/helpers.js';
import { SceneAnimator } from './animations/gsap-scene.js';
import { animateUIOnLoad } from './animations/gsap-ui.js';
import { PipBoyScreenMeshManager } from './three/pipboy-screen-mesh.js';
import { pipboyAudio } from './pipboy/audio.js';

class App {
  constructor() {
    this.sceneManager = new SceneManager('webgl-canvas');
    this.lightingManager = new LightingManager(this.sceneManager.scene);
    this.controls = setupControls(this.sceneManager.camera, this.sceneManager.canvas);

    this.activeModel = null;
    this.screenMeshManager = null;
    this.autoRotate = false;
    this.rotationSpeed = 0.3;

    // Initial Spawn Rotation Angles (in degrees for X, Y, Z axes)
    this.spawnRotationDegrees = { x: 90, y: 0, z: 0 };

    this.init();
  }

  async init() {
    // 0. Wait for custom monofonto font (normal & bold) to be loaded
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('16px "monofonto"'),
          document.fonts.load('bold 28px "monofonto"')
        ]);
        await document.fonts.ready;
      }
    } catch (err) {
      console.warn('[PipBoy App] Font preloading error:', err);
    }

    // 1. Initialize Default Pip-Boy Mesh placeholder
    this.activeModel = createPipBoy3000Mesh();
    this.sceneManager.scene.add(this.activeModel);

    // 2. Initialize 3D Screen Surface Texture Manager & Scene Animator
    this.screenMeshManager = new PipBoyScreenMeshManager(this.sceneManager.scene);
    this.screenMeshManager.attachToModel(this.activeModel);

    this.animator = new SceneAnimator(
      this.sceneManager.camera,
      this.activeModel,
      this.controls,
      this.screenMeshManager
    );

    // Trigger subtle mechanical Pip-Boy recoil when buttons, wheel, or knobs are used
    this.screenMeshManager.onPhysicalInteraction = (evt) => {
      if (this.animator) {
        this.animator.triggerInteractionRecoil(evt);
      }
    };

    // 3. Register Render Loop for continuous 3D Surface Texture & Interactive Parts updates
    this.sceneManager.onUpdate((delta, elapsedTime) => {
      if (this.controls && this.controls.enabled) {
        this.controls.update();
      }

      // Update offscreen 2D UI Canvas, upload GPU Texture & animate 3D parts
      if (this.screenMeshManager) {
        this.screenMeshManager.update(elapsedTime);
      }

      // Only autorotate when in casing inspection view
      if (this.autoRotate && this.activeModel && !this.animator.isZoomedToScreen) {
        this.activeModel.rotation.y += delta * this.rotationSpeed;
      }
    });

    // 4. Start Render Loop
    this.sceneManager.startRenderLoop();

    // 5. Load Pip-Boy Model File (assets/models/pipboy_wip.glb)
    try {
      await this.loadPipBoyModel();
    } catch (err) {
      console.warn('[PipBoy App] Model loading error:', err);
    } finally {
      // 6. Perform camera zoom right onto the 3D screen texture surface as full-screen interface
      this.animator.zoomToScreen(1.8);
      if (this.screenMeshManager?.interactiveParts) {
        this.screenMeshManager.interactiveParts.triggerAccessAnimation();
      }
      pipboyAudio.playPowerOn();

      this.bindEvents();
      this.hideLoadingOverlay();
      animateUIOnLoad();
    }
  }

  async loadPipBoyModel() {
    const modelPath = './assets/models/pipboy_wip.glb';

    const loadedModel = await loadGLTFModel(modelPath, (percent) => {
      const text = document.getElementById('loading-text');
      if (text) text.innerText = `Loading Pip-Boy Model & Mapping 3D Texture... ${percent}%`;
    });

    if (loadedModel) {
      if (this.activeModel) {
        this.sceneManager.scene.remove(this.activeModel);
      }
      this.activeModel = loadedModel;

      // Apply initial spawn rotation angles (converted from degrees to radians)
      this.activeModel.rotation.x = THREE.MathUtils.degToRad(this.spawnRotationDegrees.x);
      this.activeModel.rotation.y = THREE.MathUtils.degToRad(this.spawnRotationDegrees.y);
      this.activeModel.rotation.z = THREE.MathUtils.degToRad(this.spawnRotationDegrees.z);

      this.sceneManager.scene.add(this.activeModel);
      this.animator.setTargetObject(this.activeModel);

      // Attach 3D screen mesh directly to the model container
      if (this.screenMeshManager) {
        this.screenMeshManager.attachToModel(this.activeModel);
        this.animator.setScreenMeshManager(this.screenMeshManager);
      }
    }
  }

  bindEvents() {
    const canvas = this.sceneManager.canvas;

    // 3D Raycasting mouse interaction on the physical 3D Pip-Boy screen surface
    canvas.addEventListener('pointerdown', (e) => {
      if (this.screenMeshManager) {
        this.screenMeshManager.handlePointerDown(e, this.sceneManager.camera, canvas);
      }
    });

    // Pointer hover effect to switch to pointer cursor over interactive hitboxes
    canvas.addEventListener('pointermove', (e) => {
      if (this.screenMeshManager) {
        this.screenMeshManager.handlePointerMove(e, this.sceneManager.camera, canvas);
      }
    });

    // Mouse wheel scroll in zoomed interface mode spins the 3D brass thumb wheel & steps selection
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.animator?.isZoomedToScreen && this.screenMeshManager) {
          e.preventDefault();
          this.screenMeshManager.handleWheel(e);
        }
      },
      { passive: false }
    );

    // Double-click on canvas to smoothly toggle full-screen interface mode
    canvas.addEventListener('dblclick', () => {
      if (this.animator.isZoomedToScreen) {
        pipboyAudio.playAccessDown();
      } else {
        pipboyAudio.playAccessUp();
      }
      this.screenMeshManager?.interactiveParts?.triggerAccessAnimation();
      this.animator.toggleZoom();
    });

    // Zoom Toggle Button & Shortcut
    const zoomBtn = document.getElementById('btn-zoom-toggle');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        if (this.animator.isZoomedToScreen) {
          pipboyAudio.playAccessDown();
        } else {
          pipboyAudio.playAccessUp();
        }
        this.screenMeshManager?.interactiveParts?.triggerAccessAnimation();
        this.animator.toggleZoom();
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (this.animator.isZoomedToScreen) {
          pipboyAudio.playAccessDown();
        } else {
          pipboyAudio.playAccessUp();
        }
        this.screenMeshManager?.interactiveParts?.triggerAccessAnimation();
        this.animator.toggleZoom();
      } else if (e.key === 'Escape' && this.animator.isZoomedToScreen) {
        e.preventDefault();
        pipboyAudio.playAccessDown();
        this.screenMeshManager?.interactiveParts?.triggerAccessAnimation();
        this.animator.zoomToFullCasing();
      } else if (e.key === '1') {
        if (this.screenMeshManager) this.screenMeshManager.screenCanvas.switchTab('STATS');
      } else if (e.key === '2') {
        if (this.screenMeshManager) this.screenMeshManager.screenCanvas.switchTab('ITEMS');
      } else if (e.key === '3') {
        if (this.screenMeshManager) this.screenMeshManager.screenCanvas.switchTab('DATA');
      } else if (e.key === '4') {
        if (this.screenMeshManager) {
          this.screenMeshManager.screenCanvas.switchTab('DATA', 'World Map');
        }
      } else if (e.key === '5' || e.key.toLowerCase() === 'r') {
        if (this.screenMeshManager) {
          this.screenMeshManager.screenCanvas.switchTab('DATA', 'Radio');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.screenMeshManager?.screenCanvas?.stepSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.screenMeshManager?.screenCanvas?.stepSelection(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.screenMeshManager?.screenCanvas?.cycleSubTab(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.screenMeshManager?.screenCanvas?.cycleSubTab(-1);
      }
    });

    // Handle responsive window resize to maintain full-screen interface framing
    window.addEventListener('resize', () => {
      if (this.animator) {
        this.animator.handleResize();
      }
    });
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
}

// Start Application on DOM Content Loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});

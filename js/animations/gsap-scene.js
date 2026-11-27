import gsapModule from 'gsap';
import * as THREE from 'three';

const gsap = window.gsap || gsapModule;

export class SceneAnimator {
  constructor(camera, targetObject, controls = null, screenMeshManager = null) {
    this.camera = camera;
    this.targetObject = targetObject;
    this.controls = controls;
    this.screenMeshManager = screenMeshManager;

    this.fullCasingPos = { x: 0, y: 1.2, z: 5.5 };
    this.isZoomedToScreen = true;

    // Spawn rotation angles (in degrees) for level front-facing display
    this.spawnRotationDegrees = { x: 90, y: 0, z: 0 };
  }

  setTargetObject(newTarget) {
    this.targetObject = newTarget;
  }

  setControls(controls) {
    this.controls = controls;
  }

  setScreenMeshManager(screenMeshManager) {
    this.screenMeshManager = screenMeshManager;
    this.updateUprightScreenInfo();
  }

  /**
   * Captures and stores the upright screen mesh transform for reliable framing
   */
  updateUprightScreenInfo() {
    if (!this.screenMeshManager || typeof this.screenMeshManager.getScreenWorldInfo !== 'function') {
      return;
    }
    const info = this.screenMeshManager.getScreenWorldInfo();
    if (info) {
      this.defaultUprightInfo = {
        center: info.center.clone(),
        width: info.width,
        height: info.height,
        scale: info.scale ? info.scale.clone() : new THREE.Vector3(1, 1, 1),
        normal: new THREE.Vector3(0, 0, 1),
        up: new THREE.Vector3(0, 1, 0)
      };
    }
  }

  /**
   * Calculates the exact camera position and distance required so the 3D Pip-Boy
   * screen mesh fills the viewport as a cinematic full-screen interface mode.
   */
  calculateZoomConfig() {
    let worldInfo = this.defaultUprightInfo;
    if (!worldInfo && this.screenMeshManager && typeof this.screenMeshManager.getScreenWorldInfo === 'function') {
      this.updateUprightScreenInfo();
      worldInfo = this.defaultUprightInfo || this.screenMeshManager.getScreenWorldInfo();
    }

    const baseCenter = worldInfo ? worldInfo.center : new THREE.Vector3(0.06, 0.15, 1.0);
    const width = worldInfo ? worldInfo.width : 1.25;
    const height = worldInfo ? worldInfo.height : 0.90;
    const scaleX = worldInfo?.scale?.x || 1;
    const scaleY = worldInfo?.scale?.y || 1;
    const normal = worldInfo ? worldInfo.normal : new THREE.Vector3(0, 0, 1);

    // Shift framing target slightly left and down so the CRT screen, the 3 glowing
    // STATS / ITEMS / DATA buttons below it, and the animated left control panel
    // (radiation gauge, brass scroll wheel, rotary knob) are all framed like Fallout: New Vegas
    const center = baseCenter.clone();
    center.x -= 0.13 * scaleX;
    center.y -= 0.065 * scaleY;

    const frameWidth = width * 1.54;
    const frameHeight = height * 1.25;

    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov || 45);
    const aspect = this.camera.aspect || (window.innerWidth / window.innerHeight);
    const tanHalfVFov = Math.tan(vFovRad / 2);
    const tanHalfHFov = tanHalfVFov * aspect;

    // Distances required to fit Pip-Boy interactive front panel height and width into frustum
    const distH = frameHeight / (2 * tanHalfVFov);
    const distW = frameWidth / (2 * tanHalfHFov);

    const fitDistance = Math.max(distH, distW) * 1.02;

    // Position camera along screen normal vector directly in front of screen center
    const cameraPos = center.clone().add(normal.clone().multiplyScalar(fitDistance));

    return {
      cameraPosition: cameraPos,
      target: center.clone(),
      fitDistance: fitDistance,
      normal: normal.clone()
    };
  }

  /**
   * Zoom camera directly onto the 3D Pip-Boy CRT screen display,
   * framing it as full-screen interface mode.
   */
  zoomToScreen(duration = 1.6) {
    if (!gsap) return;
    this.isZoomedToScreen = true;

    // Disable OrbitControls during camera zoom to prevent gesture conflicts
    if (this.controls) {
      this.controls.enabled = false;
    }

    // Smoothly reset Pip-Boy model rotation to front-facing orientation if tilted
    if (this.targetObject) {
      gsap.to(this.targetObject.rotation, {
        x: THREE.MathUtils.degToRad(this.spawnRotationDegrees.x),
        y: THREE.MathUtils.degToRad(this.spawnRotationDegrees.y),
        z: THREE.MathUtils.degToRad(this.spawnRotationDegrees.z),
        duration: duration * 0.85,
        ease: 'power3.inOut'
      });
    }

    const { cameraPosition, target } = this.calculateZoomConfig();

    if (this.controls) {
      gsap.to(this.controls.target, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: duration,
        ease: 'power3.inOut'
      });
    }

    gsap.to(this.camera.position, {
      x: cameraPosition.x,
      y: cameraPosition.y,
      z: cameraPosition.z,
      duration: duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.camera.lookAt(target);
      },
      onComplete: () => {
        this.camera.lookAt(target);
        // Keep OrbitControls locked in full-screen interface mode so mouse clicks directly
        // interact with on-screen buttons/tabs without accidental camera rotation
        if (this.controls) {
          this.controls.enabled = false;
          this.controls.target.copy(target);
        }
      }
    });

    this._updateHUDMode(true);
  }

  /**
   * Zoom camera out to view full 3D Pip-Boy casing and pedestal.
   */
  zoomToFullCasing(duration = 1.4) {
    if (!gsap) return;
    this.isZoomedToScreen = false;

    // Center controls target back to casing center
    if (this.controls) {
      gsap.to(this.controls.target, {
        x: 0,
        y: 0.2,
        z: 0,
        duration: duration,
        ease: 'power3.inOut'
      });
    }

    gsap.to(this.camera.position, {
      x: this.fullCasingPos.x,
      y: this.fullCasingPos.y,
      z: this.fullCasingPos.z,
      duration: duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        if (this.controls) {
          this.camera.lookAt(this.controls.target);
        }
      },
      onComplete: () => {
        // Re-enable OrbitControls for free 3D casing rotation & inspection
        if (this.controls) {
          this.controls.enabled = true;
          this.controls.update();
        }
      }
    });

    this._updateHUDMode(false);
  }

  toggleZoom() {
    if (this.isZoomedToScreen) {
      this.zoomToFullCasing();
    } else {
      this.zoomToScreen();
    }
  }

  /**
   * Update button text and body CSS class for full-screen interface mode
   */
  _updateHUDMode(isFullScreen) {
    document.body.classList.toggle('pipboy-fullscreen-mode', isFullScreen);

    const zoomBtn = document.getElementById('btn-zoom-toggle');
    if (zoomBtn) {
      if (isFullScreen) {
        zoomBtn.textContent = '🔍 3D CASING VIEW [TAB]';
        zoomBtn.setAttribute('title', 'Zoom out to view full 3D Pip-Boy casing');
      } else {
        zoomBtn.textContent = '🖥️ FULL SCREEN INTERFACE [TAB]';
        zoomBtn.setAttribute('title', 'Zoom in to full screen Pip-Boy interface mode');
      }
    }
  }

  /**
   * Adjust camera framing dynamically when browser window is resized
   */
  handleResize() {
    if (this.isZoomedToScreen) {
      const { cameraPosition, target } = this.calculateZoomConfig();
      this.camera.position.copy(cameraPosition);
      this.camera.lookAt(target);
      if (this.controls) {
        this.controls.target.copy(target);
      }
    }
  }

  /**
   * Pulse/spin animation on click or trigger
   */
  pulseAndSpin() {
    if (!this.targetObject || !gsap) return;

    gsap.timeline()
      .to(this.targetObject.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 0.4,
        ease: 'back.out(1.7)'
      })
      .to(this.targetObject.rotation, {
        y: this.targetObject.rotation.y + Math.PI * 2,
        duration: 1.2,
        ease: 'power2.inOut'
      }, '<')
      .to(this.targetObject.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.6,
        ease: 'power2.out'
      });
  }

  resetCamera() {
    this.zoomToScreen(1.2);
  }

  /**
   * Subtle mechanical casing recoil / tactile impulse when the user presses buttons,
   * spins the thumb wheel, or turns the rotary selector knob.
   */
  triggerInteractionRecoil(evt = {}) {
    if (!this.targetObject || !gsap) return;

    const isMajor = evt.type === 'tab' || evt.partId === 'STATS' || evt.partId === 'ITEMS' || evt.partId === 'DATA';
    const strength = this.isZoomedToScreen ? (isMajor ? 1.0 : 0.55) : (isMajor ? 1.8 : 1.0);
    const dir = evt.direction || 1;

    if (this.isZoomedToScreen) {
      const baseRotX = THREE.MathUtils.degToRad(this.spawnRotationDegrees.x);
      const baseRotY = THREE.MathUtils.degToRad(this.spawnRotationDegrees.y);
      const baseRotZ = THREE.MathUtils.degToRad(this.spawnRotationDegrees.z);

      gsap.timeline({ overwrite: 'auto' })
        .to(this.targetObject.rotation, {
          x: baseRotX + 0.006 * strength,
          z: baseRotZ + 0.003 * dir * strength,
          duration: 0.06,
          ease: 'power2.out'
        })
        .to(this.targetObject.rotation, {
          x: baseRotX,
          y: baseRotY,
          z: baseRotZ,
          duration: 0.26,
          ease: 'elastic.out(1.2, 0.4)'
        });
    } else {
      gsap.timeline({ overwrite: 'auto' })
        .to(this.targetObject.position, {
          z: -0.025 * strength,
          duration: 0.06,
          ease: 'power2.out'
        })
        .to(this.targetObject.position, {
          z: 0,
          duration: 0.28,
          ease: 'elastic.out(1.2, 0.4)'
        });
    }
  }
}

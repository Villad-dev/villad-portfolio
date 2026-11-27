import * as THREE from 'three';
import { PipBoyScreenCanvas, EdgeInsets } from '../pipboy/screen-texture-canvas.js';
import { pipboyAudio } from '../pipboy/audio.js';
import { PipBoyInteractivePartsManager } from './pipboy-interactive-parts.js';

export class PipBoyScreenMeshManager {
  constructor(scene) {
    this.scene = scene;

    // Flutter-style padding: specify every param (top, left, right, bottom)
    this.screenPadding = {
      top: 32,
      left: 32,
      right: 32,
      bottom: 76
    };

    this.screenCanvas = new PipBoyScreenCanvas(this.screenPadding);
    this.screenTexture = null;
    this.screenMaterial = null;
    this.screenMesh = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Callback for external scene recoil animations on user interaction
    this.onPhysicalInteraction = null;

    // Physical 3D Interactive Parts (Glowing STATS/ITEMS/DATA buttons, Brass Wheel, Rotary Knob, Radiation Gauge)
    this.interactiveParts = new PipBoyInteractivePartsManager(
      this.screenCanvas,
      (partId, val) => {
        if (this.onPhysicalInteraction) {
          this.onPhysicalInteraction({ type: 'part', partId, direction: val });
        }
      }
    );

    // Connect 2D Screen Canvas interactions to 3D physical parts animations
    this.screenCanvas.onInteraction = (evt) => {
      if (!this.interactiveParts) return;
      if (evt.type === 'tab') {
        this.interactiveParts.syncWithScreenState(true);
        this.interactiveParts.spinWheel(evt.direction || 1);
      } else if (evt.type === 'subtab') {
        this.interactiveParts.rotateKnobToSubTab(evt.subTabIndex ?? 0, true);
        this.interactiveParts.spinWheel(evt.direction || 1);
        this.interactiveParts.pulseGauge(0.65);
      } else if (evt.type === 'item') {
        this.interactiveParts.spinWheel(evt.direction || 1);
        this.interactiveParts.pulseGauge(0.45);
      }
      if (this.onPhysicalInteraction) {
        this.onPhysicalInteraction(evt);
      }
    };

    this.init();
  }

  init() {
    // 1. Create Canvas Texture from the 2D UI Canvas
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas.canvas);
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;

    // 2. Material with DoubleSide & Toned-Down Phosphor Glow
    this.screenMaterial = new THREE.MeshStandardMaterial({
      map: this.screenTexture,
      emissiveMap: this.screenTexture,
      roughness: 0.42,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    // 3. Manual Position, Size, Arch Curvature & Rotation Settings (in degrees)
    this.screenWidth = 1.25;
    this.screenHeight = 0.9;
    this.screenArchCurve = 0.05; // 3D Arch curvature depth (0 = flat, 0.15 = CRT arch)
    this.screenPosition = { x: 0.06, y: 1, z: -0.15 };
    this.screenRotationDegrees = { x: 180, y: 180, z: 0 };

    // 4. Create 3D Curved CRT Arch Screen Geometry
    const geo = this.createCurvedScreenGeometry(this.screenWidth, this.screenHeight, this.screenArchCurve);
    this.screenMesh = new THREE.Mesh(geo, this.screenMaterial);

    // Apply position & manual rotation angles (converted from degrees to radians)
    this.screenMesh.position.set(this.screenPosition.x, this.screenPosition.y, this.screenPosition.z);
    this.screenMesh.rotation.x = THREE.MathUtils.degToRad(this.screenRotationDegrees.x - 90);
    this.screenMesh.rotation.y = THREE.MathUtils.degToRad(this.screenRotationDegrees.y);
    this.screenMesh.rotation.z = THREE.MathUtils.degToRad(this.screenRotationDegrees.z + 180);

    this.screenMesh.name = 'PipBoyPhysical3DScreen';
    this.screenMesh.renderOrder = 10;
  }

  /**
   * Helper to create a 3D curved CRT arch segment geometry
   */
  createCurvedScreenGeometry(width, height, archCurve = 0.15) {
    const widthSegments = 32;
    const heightSegments = 16;
    const geo = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

    if (archCurve !== 0) {
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const normX = x / (width / 2); // [-1 .. 1]
        // Curve along X axis into a 3D retro CRT arch
        const zOffset = (1 - Math.cos(normX * (Math.PI / 2))) * archCurve;
        posAttr.setZ(i, -zOffset);
      }
      geo.computeVertexNormals();
    }

    return geo;
  }

  /**
   * Attach the 3D screen mesh and interactive 3D parts directly inside the GLTF model scene hierarchy.
   */
  attachToModel(containerGroup) {
    if (!this.screenMesh || !containerGroup) return;

    if (this.screenMesh.parent) {
      this.screenMesh.parent.remove(this.screenMesh);
    }

    const gltfScene =
      containerGroup.userData.gltfScene ||
      (containerGroup.children.length > 0 ? containerGroup.children[0] : containerGroup);
    gltfScene.add(this.screenMesh);

    if (this.interactiveParts) {
      this.interactiveParts.attachToModel(containerGroup);
    }
  }

  update(elapsedTime = performance.now() * 0.001) {
    // Render offscreen canvas and mark texture for WebGL GPU update
    this.screenCanvas.render();
    if (this.screenTexture) {
      this.screenTexture.needsUpdate = true;
    }

    // Update animated 3D physical parts (incandescent button glow breathing & Geiger needle jitter)
    if (this.interactiveParts) {
      this.interactiveParts.update(elapsedTime);
    }
  }

  /**
   * Raycast mouse clicks on the 3D WebGL viewport canvas to both the 3D interactive buttons/knobs/wheel
   * and the 3D CRT screen surface texture.
   */
  handlePointerDown(event, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    // 1. Check 3D physical parts & screen together sorted by distance
    const partTargets = this.interactiveParts ? this.interactiveParts.interactiveTargets : [];
    const allTargets = [...partTargets, this.screenMesh].filter(Boolean);
    const intersects = this.raycaster.intersectObjects(allTargets, true);

    if (intersects.length > 0) {
      const firstHit = intersects[0];

      // Check if closest intersection is one of the 3D physical parts (buttons, wheel, knob, gauge)
      if (this.interactiveParts && firstHit.object !== this.screenMesh) {
        const handledPart = this.interactiveParts.handlePartClick(firstHit.object);
        if (handledPart) return;
      }

      // Otherwise check if the ray hit the 3D screen mesh
      const screenHit = intersects.find((hit) => hit.object === this.screenMesh);
      if (screenHit && screenHit.uv) {
        // Convert UV coordinates [0..1] to Canvas Pixel Coordinates [1024x768]
        const canvasX = screenHit.uv.x * 1024;
        const canvasY = (1 - screenHit.uv.y) * 768;

        const handled = this.screenCanvas.handleClick(canvasX, canvasY);
        if (!handled) {
          pipboyAudio.playClick();
          if (this.interactiveParts) {
            this.interactiveParts.pulseGauge(0.35);
          }
        }
      }
    }
  }

  /**
   * Raycast mouse hover to give interactive pointer cursor feedback over 3D buttons, knobs, wheel, and screen hitboxes
   */
  handlePointerMove(event, camera, canvas) {
    if (!this.screenMesh) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    const partTargets = this.interactiveParts ? this.interactiveParts.interactiveTargets : [];
    const allTargets = [...partTargets, this.screenMesh].filter(Boolean);
    const intersects = this.raycaster.intersectObjects(allTargets, true);

    if (intersects.length > 0) {
      const firstHit = intersects[0];

      // Hovering over a physical 3D interactive part (STATS/ITEMS/DATA button, wheel, knob, gauge)
      if (firstHit.object !== this.screenMesh) {
        canvas.style.cursor = 'pointer';
        return;
      }

      // Hovering over the 3D CRT screen surface
      if (firstHit.uv) {
        const canvasX = firstHit.uv.x * 1024;
        const canvasY = (1 - firstHit.uv.y) * 768;

        let isOverInteractive = false;
        for (const box of this.screenCanvas.hitboxes) {
          if (
            canvasX >= box.x &&
            canvasX <= box.x + box.w &&
            canvasY >= box.y &&
            canvasY <= box.y + box.h
          ) {
            isOverInteractive = true;
            break;
          }
        }

        canvas.style.cursor = isOverInteractive ? 'pointer' : 'default';
        return;
      }
    }

    canvas.style.cursor = 'default';
  }

  /**
   * Handles mouse wheel scrolling to spin the physical 3D brass thumb wheel and step through items/subtabs
   */
  handleWheel(event) {
    if (!this.screenCanvas) return;
    const dir = event.deltaY > 0 ? 1 : -1;
    this.screenCanvas.stepSelection(dir);
  }

  /**
   * Returns exact 3D world space position, dimensions and orientation of the screen mesh.
   * Used to dynamically frame the Pip-Boy screen & front controls as an interactive interface.
   */
  getScreenWorldInfo() {
    if (!this.screenMesh) return null;

    this.screenMesh.updateWorldMatrix(true, false);

    const center = new THREE.Vector3();
    this.screenMesh.getWorldPosition(center);

    const quaternion = new THREE.Quaternion();
    this.screenMesh.getWorldQuaternion(quaternion);

    const scale = new THREE.Vector3();
    this.screenMesh.getWorldScale(scale);

    const box = new THREE.Box3().setFromObject(this.screenMesh);
    const size = box.getSize(new THREE.Vector3());

    // Screen normal in world space (faces forward along +Z in local coordinates)
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();

    return {
      center,
      width: size.x > 0 ? size.x : this.screenWidth * scale.x,
      height: size.y > 0 ? size.y : this.screenHeight * scale.y,
      normal,
      up,
      scale
    };
  }
}

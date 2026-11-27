import * as THREE from 'three';
import gsapModule from 'gsap';
import { pipboyAudio } from '../pipboy/audio.js';

const gsap = window.gsap || gsapModule;

/**
 * Manages the physical 3D interactive components of the Pip-Boy 3000 model:
 * 1. Glowing Mode Buttons (STATS, ITEMS, DATA) + Illuminated Stenciled Labels + Warm Lamp PointLight
 * 2. Ridged Brass Thumb Scroll Wheel (360° continuous rotation on item selection / wheel scroll)
 * 3. Bottom-Left Rotary Sub-Mode Selector Knob & Pointer (rotates to tick marks on subtab change)
 * 4. Top-Left Radiation / Geiger Counter Gauge + Animated 3D Needle (micro-jitter + deflection spikes)
 * 5. Multi-material Casing Detailing (Pip-Boy & Model 3000 plaques, brushed steel bezel screws)
 */
export class PipBoyInteractivePartsManager {
  constructor(screenCanvas, onModeSelect = null) {
    this.screenCanvas = screenCanvas;
    this.onModeSelect = onModeSelect;

    // Root container attached to gltfScene
    this.partsGroup = new THREE.Group();
    this.partsGroup.name = 'PipBoyInteractive3DParts';

    // Button definitions in gltfScene coordinate space
    // (+X = right, +Y = forward toward viewer, +Z = down on Pip-Boy face)
    this.buttonConfigs = [
      { id: 'STATS', label: 'STATS', index: 0, x: -0.1661, y: 1.1182, z: 0.3611 },
      { id: 'ITEMS', label: 'ITEMS', index: 1, x: 0.0500, y: 1.1182, z: 0.3611 },
      { id: 'DATA', label: 'DATA', index: 2, x: 0.2661, y: 1.1182, z: 0.3611 }
    ];

    this.activeButtonIndex = 0; // 0 = STATS, 1 = ITEMS, 2 = DATA
    this.buttonMeshes = [];     // Inner translucent glowing button caps
    this.collarMeshes = [];     // Outer metallic button bezels
    this.buttonHaloSprites = [];

    // Other animated 3D part references
    this.wheelPivot = null;
    this.wheelRotationX = 0;

    this.knobPivot = null;
    this.dialPlateMesh = null;

    this.gaugeDiscMesh = null;
    this.gaugeNeedlePivot = null;
    this.gaugeBaseAngle = 0.55; // Resting angle in upper-right safe/caution zone
    this.gaugeSpikeOffset = { value: 0 };

    // Label strip above the 3 buttons ("STATS   ITEMS   DATA")
    this.labelCanvas = null;
    this.labelTexture = null;
    this.labelMesh = null;
    this.labelHitMeshes = [];

    // Dynamic warm incandescent PointLight over the active button
    this.buttonPointLight = null;

    // Interactive raycast targets
    this.interactiveTargets = [];

    // Materials & Textures
    this._initTexturesAndMaterials();
  }

  /**
   * Creates procedural high-DPI CanvasTextures for the glowing/unlit orange buttons,
   * metallic collars, STATS/ITEMS/DATA backlit label strip, radiation gauge face, and plaques.
   */
  _initTexturesAndMaterials() {
    // 1. Active Lit Orange/Amber Button Texture (incandescent hot core + glowing orange lens)
    this.litButtonTexture = this._createButtonCapTexture(true);
    // 2. Inactive Unlit Translucent Amber/Red-Orange Button Texture
    this.unlitButtonTexture = this._createButtonCapTexture(false);
    // 3. Button Metallic Collar Bezel Texture (dark socket center + brushed bronze/steel rim)
    this.collarTexture = this._createButtonCollarTexture();

    // Create individual materials per button so GSAP can smoothly tween each button's glow
    this.buttonMaterials = this.buttonConfigs.map((cfg, idx) => {
      const isLit = idx === this.activeButtonIndex;
      return new THREE.MeshStandardMaterial({
        map: isLit ? this.litButtonTexture : this.unlitButtonTexture,
        emissive: new THREE.Color(isLit ? 0xd95b12 : 0x661a04),
        emissiveMap: isLit ? this.litButtonTexture : this.unlitButtonTexture,
        emissiveIntensity: isLit ? 0.42 : 0.03,
        roughness: isLit ? 0.45 : 0.52,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
    });

    this.collarMaterial = new THREE.MeshStandardMaterial({
      map: this.collarTexture,
      roughness: 0.48,
      metalness: 0.65,
      side: THREE.DoubleSide
    });

    // Soft radial amber glow halo texture for active button
    this.haloTexture = this._createGlowHaloTexture();

    // Brass thumb scroll wheel material (matches Fallout: New Vegas golden-brass ridged wheel)
    this.wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0xc29b38,
      roughness: 0.30,
      metalness: 0.82,
      side: THREE.DoubleSide
    });

    // Dark Bakelite rotary mode selector knob material
    this.knobMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c201c,
      roughness: 0.38,
      metalness: 0.32,
      side: THREE.DoubleSide
    });

    // Brushed steel dial collar, tick marks & bezel screws material
    this.steelMaterial = new THREE.MeshStandardMaterial({
      color: 0x8e9688,
      roughness: 0.28,
      metalness: 0.85,
      side: THREE.DoubleSide
    });

    // Radiation Gauge Dial Face Texture & Material
    this.gaugeTexture = this._createRadiationGaugeTexture();
    this.gaugeMaterial = new THREE.MeshStandardMaterial({
      map: this.gaugeTexture,
      emissive: new THREE.Color(0xfff0c8),
      emissiveMap: this.gaugeTexture,
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // STATS / ITEMS / DATA Label Strip Canvas & Texture
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 96;
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.minFilter = THREE.LinearFilter;
    this.labelTexture.magFilter = THREE.LinearFilter;
    this._renderButtonLabelsCanvas(this.activeButtonIndex);

    // Model 3000 Plate with 2 Screws Canvas & Texture
    this.modelPlaqueCanvas = document.createElement('canvas');
    this.modelPlaqueCanvas.width = 512;
    this.modelPlaqueCanvas.height = 112;
    this.modelPlaqueTexture = new THREE.CanvasTexture(this.modelPlaqueCanvas);
    this.modelPlaqueTexture.minFilter = THREE.LinearFilter;
    this.modelPlaqueTexture.magFilter = THREE.LinearFilter;
    this._renderModel3000PanelCanvas();

    this._ensureMonofontoLoaded();
  }

  /**
   * Explicitly loads assets/fonts/monofonto.ttf via FontFace API and re-renders
   * the STATS / ITEMS / DATA labels and Model 3000 panel once the font is ready.
   */
  async _ensureMonofontoLoaded() {
    if (typeof document === 'undefined' || !document.fonts) return;
    try {
      if (typeof FontFace !== 'undefined') {
        const fontRegular = new FontFace('monofonto', 'url(./assets/fonts/monofonto.ttf)', {
          weight: 'normal',
          style: 'normal'
        });
        const fontBold = new FontFace('monofonto', 'url(./assets/fonts/monofonto.ttf)', {
          weight: 'bold',
          style: 'normal'
        });
        const [loadedReg, loadedBold] = await Promise.all([fontRegular.load(), fontBold.load()]);
        document.fonts.add(loadedReg);
        document.fonts.add(loadedBold);
      } else {
        await document.fonts.load('28px "monofonto"');
        await document.fonts.load('bold 28px "monofonto"');
        await document.fonts.load('bold 42px "monofonto"');
      }
      await document.fonts.ready;
    } catch (err) {
      console.warn('[PipBoyInteractiveParts] monofonto font load fallback:', err);
    }
    this._renderButtonLabelsCanvas(this.activeButtonIndex);
    this._renderModel3000PanelCanvas();
  }

  /**
   * Generates a 256x256 radial texture for the circular Pip-Boy mode buttons (STATS, ITEMS, DATA)
   */
  _createButtonCapTexture(isLit) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;

    ctx.clearRect(0, 0, 256, 256);

    if (isLit) {
      // Toned-down warm amber-orange button lens (soft warm center transitioning to deep amber rim)
      const grad = ctx.createRadialGradient(cx - 6, cy - 6, 6, cx, cy, 118);
      grad.addColorStop(0.0, '#f0a848');
      grad.addColorStop(0.25, '#df7620');
      grad.addColorStop(0.55, '#b8480c');
      grad.addColorStop(0.80, '#782605');
      grad.addColorStop(0.94, '#3e1203');
      grad.addColorStop(1.0, '#1e0802');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Subtle concentric Fresnel lens ridges inside the plastic button cap
      ctx.strokeStyle = 'rgba(255, 190, 110, 0.14)';
      ctx.lineWidth = 2;
      for (const r of [32, 58, 84]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Unlit translucent dark burnt-orange plastic lens (as seen on ITEMS and DATA in reference image)
      const grad = ctx.createRadialGradient(cx - 12, cy - 12, 8, cx, cy, 118);
      grad.addColorStop(0.0, '#8f3512');
      grad.addColorStop(0.38, '#6b2209');
      grad.addColorStop(0.70, '#451304');
      grad.addColorStop(0.90, '#240802');
      grad.addColorStop(1.0, '#140401');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // Subtle top-left satin highlight on unlit plastic lens
      const spec = ctx.createRadialGradient(cx - 30, cy - 32, 2, cx - 22, cy - 24, 44);
      spec.addColorStop(0.0, 'rgba(220, 140, 95, 0.18)');
      spec.addColorStop(0.6, 'rgba(180, 95, 50, 0.06)');
      spec.addColorStop(1.0, 'rgba(150, 70, 30, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dark bevel shadow ring at outer edge where button cap meets metal collar
    ctx.strokeStyle = 'rgba(15, 6, 2, 0.75)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 114, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Generates a 256x256 radial texture for the metallic bezel collars around the 3 buttons
   */
  _createButtonCollarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;

    // Outer metallic ring + dark recessed socket cavity inside r < 96
    const grad = ctx.createRadialGradient(cx, cy, 78, cx, cy, 128);
    grad.addColorStop(0.0, '#090806');
    grad.addColorStop(0.58, '#0d0b08');
    grad.addColorStop(0.66, '#2b2820');
    grad.addColorStop(0.78, '#7a7562');
    grad.addColorStop(0.88, '#9c9680');
    grad.addColorStop(0.96, '#4a473a');
    grad.addColorStop(1.0, '#2c2b22');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Soft additive orange-amber bloom halo sprite texture for the active glowing button
   */
  _createGlowHaloTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 220, 120, 0.85)');
    grad.addColorStop(0.35, 'rgba(255, 130, 24, 0.48)');
    grad.addColorStop(0.7, 'rgba(255, 80, 0, 0.14)');
    grad.addColorStop(1.0, 'rgba(255, 60, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Renders the "STATS   ITEMS   DATA" stenciled text directly onto a transparent canvas
   * using the authentic monofonto.ttf font (no horizontal scaling distortion or background box).
   */
  _renderButtonLabelsCanvas(activeIdx = 0) {
    if (!this.labelCanvas) return;
    const ctx = this.labelCanvas.getContext('2d');
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Label horizontal positions mapped to match the 3 buttons (-0.1661, 0.0500, 0.2661)
    const labelXPositions = [78, 256, 434];
    const labels = ['STATS', 'ITEMS', 'DATA'];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px "monofonto", monospace';

    labels.forEach((text, idx) => {
      const lx = labelXPositions[idx];
      const ly = h * 0.56;
      const isLit = idx === activeIdx;

      ctx.save();
      // Subtle dark recessed shadow so yellow stencil text stands out cleanly on the metal surface
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = 'rgba(20, 18, 8, 0.82)';
      ctx.strokeText(text, lx, ly);

      // Yellow stencil lettering (bright warm yellow when active, rich vintage yellow when inactive)
      ctx.fillStyle = isLit ? '#ffe04d' : '#e0b82e';
      ctx.fillText(text, lx, ly);
      ctx.restore();
    });

    if (this.labelTexture) {
      this.labelTexture.needsUpdate = true;
    }
  }

  /**
   * Renders the authentic "Model 3000" metal panel with two screws on the left and right
   * and prominent, larger monofonto.ttf typography centered on the plate.
   */
  _renderModel3000PanelCanvas() {
    if (!this.modelPlaqueCanvas) return;
    const ctx = this.modelPlaqueCanvas.getContext('2d');
    const w = this.modelPlaqueCanvas.width;
    const h = this.modelPlaqueCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Recessed dark metallic panel plate
    const padX = 6;
    const padY = 5;
    const plateW = w - padX * 2;
    const plateH = h - padY * 2;
    const r = 8;

    // Dark beveled border / outer rim
    ctx.fillStyle = '#1c201a';
    ctx.beginPath();
    ctx.roundRect(padX, padY, plateW, plateH, r);
    ctx.fill();

    // Inner plate surface gradient
    const innerGrad = ctx.createLinearGradient(0, padY + 3, 0, padY + plateH - 3);
    innerGrad.addColorStop(0.0, '#1c1f19');
    innerGrad.addColorStop(0.5, '#141712');
    innerGrad.addColorStop(1.0, '#0c0e0b');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.roundRect(padX + 3, padY + 3, plateW - 6, plateH - 6, r - 2);
    ctx.fill();

    // Brushed metallic plate frame edge with subtle highlight
    ctx.strokeStyle = 'rgba(145, 152, 134, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(padX + 2, padY + 2, plateW - 4, plateH - 4, r - 1);
    ctx.stroke();

    // 2. Realistic left & right metallic screws on the panel
    const drawScrew = (cx, cy) => {
      const radius = 18;

      // Outer dark socket bevel
      ctx.strokeStyle = 'rgba(10, 14, 10, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Brushed steel screw head gradient
      const sGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, radius);
      sGrad.addColorStop(0.0, '#d6dcd0');
      sGrad.addColorStop(0.55, '#8c9584');
      sGrad.addColorStop(0.85, '#565e50');
      sGrad.addColorStop(1.0, '#262a22');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Top-left specular rim reflection
      ctx.strokeStyle = 'rgba(245, 250, 240, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();

      // Screw center slot (slanted 35° flathead slot with depth)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI * 0.22);
      ctx.fillStyle = '#0a0d09';
      ctx.fillRect(-11, -2.8, 22, 5.6);
      // Highlight on slot bottom lip
      ctx.fillStyle = 'rgba(235, 240, 225, 0.45)';
      ctx.fillRect(-11, 2.8, 22, 1.2);
      ctx.restore();
    };

    const screwLeftX = padX + 38;
    const screwRightX = w - padX - 38;
    const screwY = h * 0.5;
    drawScrew(screwLeftX, screwY);
    drawScrew(screwRightX, screwY);

    // 3. "• Model 3000 •" label in prominent, larger bold monofonto font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 42px "monofonto", monospace';

    const textX = w * 0.5;
    const textY = h * 0.53;
    const labelText = '• Model 3000 •';

    // Engraved drop shadow for crisp metal stamped look
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = 'rgba(8, 10, 6, 0.95)';
    ctx.strokeText(labelText, textX, textY);

    // Crisp aged ivory-silver stencil finish
    ctx.fillStyle = '#eae5d4';
    ctx.fillText(labelText, textX, textY);

    if (this.modelPlaqueTexture) {
      this.modelPlaqueTexture.needsUpdate = true;
    }
  }

  /**
   * Generates the authentic Fallout: New Vegas top-left Radiation Gauge dial texture
   * (cream face, grid lines, yellow/red hazard arc on the right, x100 & radiation trefoil)
   */
  _createRadiationGaugeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128;
    const cy = 128;
    const r = 120;

    // 1. Aged cream/ivory dial face
    const faceGrad = ctx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, r);
    faceGrad.addColorStop(0.0, '#f5efd6');
    faceGrad.addColorStop(0.75, '#ded5b4');
    faceGrad.addColorStop(0.95, '#9c9274');
    faceGrad.addColorStop(1.0, '#3a3628');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Subtle instrument grid lines
    ctx.strokeStyle = 'rgba(40, 38, 30, 0.25)';
    ctx.lineWidth = 1.5;
    for (let offset = -80; offset <= 80; offset += 26) {
      ctx.beginPath();
      ctx.moveTo(cx - r, cy + offset);
      ctx.lineTo(cx + r, cy + offset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + offset, cy - r);
      ctx.lineTo(cx + offset, cy + r);
      ctx.stroke();
    }

    // 3. Yellow & Red Radiation Danger Arc on the right side of the gauge
    // Yellow caution zone (top-right arc)
    ctx.strokeStyle = '#e5b822';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 24, -Math.PI * 0.42, Math.PI * 0.05);
    ctx.stroke();

    // Red danger zone (bottom-right arc)
    ctx.strokeStyle = '#c92a1d';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 24, Math.PI * 0.05, Math.PI * 0.42);
    ctx.stroke();

    // 4. Radial tick marks along the right scale
    ctx.strokeStyle = '#1e1c16';
    ctx.lineWidth = 2.5;
    for (let deg = -75; deg <= 75; deg += 15) {
      const rad = THREE.MathUtils.degToRad(deg);
      const rIn = r - 38;
      const rOut = r - 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * rIn, cy + Math.sin(rad) * rIn);
      ctx.lineTo(cx + Math.cos(rad) * rOut, cy + Math.sin(rad) * rOut);
      ctx.stroke();
    }

    // 5. Center "x100" text & Radiation Trefoil badge
    ctx.fillStyle = '#1e1c16';
    ctx.font = 'bold 20px "monofonto", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('x100', cx - 6, cy - 12);

    // Small yellow/black radiation circle below x100
    ctx.fillStyle = '#e5b822';
    ctx.beginPath();
    ctx.arc(cx - 6, cy + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e1c16';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1e1c16';
    for (let i = 0; i < 3; i++) {
      const a = (i * 120 - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 16);
      ctx.arc(cx - 6, cy + 16, 11, a - 0.45, a + 0.45);
      ctx.closePath();
      ctx.fill();
    }

    // Outer dark bezel rim
    ctx.strokeStyle = '#28261e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Creates a non-reflective stencil texture for "Pip-Boy" script logo and "• Model 3000 •" label
   */
  _createPlaqueTexture(text, isScript = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 64);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = isScript
      ? 'italic bold 36px Georgia, "Times New Roman", serif'
      : 'bold 21px "monofonto", "Share Tech Mono", monospace';

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20, 26, 20, 0.75)';
    ctx.strokeText(text, 128, 33);

    ctx.fillStyle = isScript ? '#9da494' : '#8c9484';
    ctx.fillText(text, 128, 33);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Attaches and extracts interactive 3D parts from the loaded GLTF Pip-Boy model
   * (or creates fallback parts if attached to the placeholder group).
   */
  attachToModel(containerGroup) {
    if (!containerGroup) return;

    const gltfScene =
      containerGroup.userData.gltfScene ||
      (containerGroup.children.length > 0 ? containerGroup.children[0] : containerGroup);

    // Clear previous partsGroup children if re-attaching
    while (this.partsGroup.children.length > 0) {
      this.partsGroup.remove(this.partsGroup.children[0]);
    }
    this.buttonMeshes = [];
    this.collarMeshes = [];
    this.buttonHaloSprites = [];
    this.interactiveTargets = [];
    this.labelHitMeshes = [];

    // Check if this is the real GLTF model with Object_2 / Object_3 meshes
    let hasGLBMeshes = false;
    gltfScene.traverse((child) => {
      if (child.isMesh && (child.name === 'Object_2' || child.name === 'Object_3')) {
        hasGLBMeshes = true;
      }
    });

    if (hasGLBMeshes) {
      this._extractAndBuildGLBParts(gltfScene);
    } else {
      this._buildFallbackParts();
    }

    // Add the common overlay elements (STATS/ITEMS/DATA label strip, PointLight, Gauge Needle, Plaques)
    this._buildLabelsAndLighting();
    this._buildGaugeNeedleAndPlaques();

    if (this.partsGroup.parent) {
      this.partsGroup.parent.remove(this.partsGroup);
    }
    gltfScene.add(this.partsGroup);

    // Sync initial visual state with current screen tab
    this.syncWithScreenState(false);
  }

  /**
   * Separates the movable/glowing parts from Object_2 and Object_3 in pipboy_wip.glb
   * into independent pivot-centered THREE.Mesh / THREE.Group nodes.
   */
  _extractAndBuildGLBParts(gltfScene) {
    // s is the Sketchfab_model root scale factor (gx = s*rx, gy = s*rz, gz = -s*ry)
    const s = 0.2647126019001007;

    const buckets = {
      wheel: [],
      knob: [],
      dial_plate: [],
      gauge_disc: [],
      screws: [],
      btn_cap_0: [],
      btn_cap_1: [],
      btn_cap_2: [],
      btn_collar_0: [],
      btn_collar_1: [],
      btn_collar_2: []
    };

    const screwCenters = [
      [-0.7825, 0.2185],
      [0.8995, -0.5002],
      [0.8816, 0.4146],
      [-0.7789, -0.5526]
    ];

    const classifyTriangle = (pa, pb, pc) => {
      const minX = Math.min(pa[0], pb[0], pc[0]);
      const maxX = Math.max(pa[0], pb[0], pc[0]);
      const minY = Math.min(pa[1], pb[1], pc[1]);
      const maxY = Math.max(pa[1], pb[1], pc[1]);
      const minZ = Math.min(pa[2], pb[2], pc[2]);
      const maxZ = Math.max(pa[2], pb[2], pc[2]);
      const ys = [pa[1], pb[1], pc[1]];

      // 1. Thumb Scroll Wheel (Comp 60630)
      if (
        minX >= -0.805 && maxX <= -0.765 &&
        minY >= 0.789 && maxY <= 0.975 &&
        minZ >= -0.321 && maxZ <= 0.058
      ) {
        return 'wheel';
      }

      // 2. Bottom-Left Rotary Knob + Pointer (Comp 63628 + 63564)
      if (minX >= -1.005 && maxX <= -0.810 && minZ >= 0.250 && maxZ <= 0.415) {
        if (
          ys.every(
            (y) =>
              Math.abs(y - 0.8475) < 0.003 ||
              Math.abs(y - 1.0332) < 0.003 ||
              Math.abs(y - 0.7837) < 0.003 ||
              Math.abs(y - 1.0334) < 0.003
          )
        ) {
          return 'knob';
        }
      }

      // 3. Rotary Dial Base Plate & 5 Tick Marks (Comp 63190 + 63094..63126)
      if (minX >= -1.050 && maxX <= -0.750 && minZ >= 0.205 && maxZ <= 0.502) {
        if (
          ys.every(
            (y) =>
              Math.abs(y - 0.7546) < 0.003 ||
              Math.abs(y - 0.7705) < 0.003 ||
              Math.abs(y - 0.8669) < 0.003 ||
              Math.abs(y - 0.8701) < 0.003 ||
              Math.abs(y - 0.8290) < 0.003 ||
              Math.abs(y - 0.8819) < 0.003
          )
        ) {
          return 'dial_plate';
        }
      }

      // 4. Three Glowing Mode Buttons (STATS, ITEMS, DATA) & Bezels
      if (minZ >= 0.280 && maxZ <= 0.442 && minY >= 0.710 && maxY <= 1.170) {
        let btnIdx = -1;
        if (minX >= -0.246 && maxX <= -0.086) btnIdx = 0;
        else if (minX >= -0.030 && maxX <= 0.130) btnIdx = 1;
        else if (minX >= 0.186 && maxX <= 0.346) btnIdx = 2;

        if (btnIdx !== -1) {
          if (ys.every((y) => Math.abs(y - 0.7382) < 0.003 || Math.abs(y - 1.1674) < 0.003)) {
            return `btn_cap_${btnIdx}`;
          }
          if (ys.every((y) => Math.abs(y - 0.7136) < 0.003 || Math.abs(y - 1.1182) < 0.003)) {
            return `btn_collar_${btnIdx}`;
          }
        }
      }

      // 5. Top-Left Radiation Gauge Disc (Comp 58092)
      if (minX >= -1.080 && maxX <= -0.862 && minZ >= -0.686 && maxZ <= -0.469) {
        if (ys.every((y) => Math.abs(y - 0.8248) < 0.003 || Math.abs(y - 0.8723) < 0.003)) {
          return 'gauge_disc';
        }
      }

      // 6. Four Screen Bezel Fastener Screws
      if (minY > 0.829 && maxY < 0.871) {
        const cx = (pa[0] + pb[0] + pc[0]) / 3;
        const cz = (pa[2] + pb[2] + pc[2]) / 3;
        for (const [sx, sz] of screwCenters) {
          if (Math.hypot(cx - sx, cz - sz) < 0.06) {
            return 'screws';
          }
        }
      }

      return 'body';
    };

    const sourceMeshes = [];
    gltfScene.traverse((child) => {
      if (child.isMesh && (child.name === 'Object_2' || child.name === 'Object_3')) {
        sourceMeshes.push(child);
      }
    });

    sourceMeshes.forEach((mesh) => {
      // Cache original index array so re-attachment is idempotent
      if (!mesh.geometry.userData.originalIndexArray && mesh.geometry.index) {
        mesh.geometry.userData.originalIndexArray = mesh.geometry.index.array.slice();
      }
      const origIndices = mesh.geometry.userData.originalIndexArray;
      const posAttr = mesh.geometry.attributes.position;
      const normAttr = mesh.geometry.attributes.normal;
      if (!origIndices || !posAttr) return;

      const bodyIndices = [];

      for (let i = 0; i < origIndices.length; i += 3) {
        const i0 = origIndices[i];
        const i1 = origIndices[i + 1];
        const i2 = origIndices[i + 2];

        const p0 = [
          s * posAttr.getX(i0),
          s * posAttr.getZ(i0),
          -s * posAttr.getY(i0)
        ];
        const p1 = [
          s * posAttr.getX(i1),
          s * posAttr.getZ(i1),
          -s * posAttr.getY(i1)
        ];
        const p2 = [
          s * posAttr.getX(i2),
          s * posAttr.getZ(i2),
          -s * posAttr.getY(i2)
        ];

        const category = classifyTriangle(p0, p1, p2);
        if (category === 'body') {
          bodyIndices.push(i0, i1, i2);
        } else if (buckets[category]) {
          const n0 = normAttr
            ? [normAttr.getX(i0), normAttr.getZ(i0), -normAttr.getY(i0)]
            : [0, 1, 0];
          const n1 = normAttr
            ? [normAttr.getX(i1), normAttr.getZ(i1), -normAttr.getY(i1)]
            : [0, 1, 0];
          const n2 = normAttr
            ? [normAttr.getX(i2), normAttr.getZ(i2), -normAttr.getY(i2)]
            : [0, 1, 0];

          buckets[category].push({ p0, p1, p2, n0, n1, n2 });
        }
      }

      // Update mesh index buffer to contain only main Pip-Boy body casing triangles
      mesh.geometry.setIndex(bodyIndices);
      mesh.geometry.computeBoundingSphere();
    });

    // Helper to build a THREE.BufferGeometry centered at pivot (px, py, pz) with optional planar radial UVs
    const buildPartGeometry = (tris, pivot, uvRadius = null, mirrorWheel180 = false) => {
      const positions = [];
      const normals = [];
      const uvs = [];
      const [px, py, pz] = pivot;

      const pushTri = (p0, p1, p2, n0, n1, n2, rotate180X = false) => {
        const pts = [p0, p1, p2];
        const nms = [n0, n1, n2];
        for (let k = 0; k < 3; k++) {
          let lx = pts[k][0] - px;
          let ly = pts[k][1] - py;
          let lz = pts[k][2] - pz;
          let nx = nms[k][0];
          let ny = nms[k][1];
          let nz = nms[k][2];

          if (rotate180X) {
            ly = -ly;
            lz = -lz;
            ny = -ny;
            nz = -nz;
          }

          positions.push(lx, ly, lz);
          normals.push(nx, ny, nz);

          if (uvRadius) {
            const u = Math.max(0, Math.min(1, 0.5 + lx / (uvRadius * 2)));
            const v = Math.max(0, Math.min(1, 0.5 - lz / (uvRadius * 2)));
            uvs.push(u, v);
          } else {
            uvs.push(0.5, 0.5);
          }
        }
      };

      for (const t of tris) {
        pushTri(t.p0, t.p1, t.p2, t.n0, t.n1, t.n2, false);
        if (mirrorWheel180) {
          // Skip flat internal seam cap at gy ~ 0.7909 so the 360° wheel is a clean closed cylinder
          const minY = Math.min(t.p0[1], t.p1[1], t.p2[1]);
          const maxY = Math.max(t.p0[1], t.p1[1], t.p2[1]);
          if (maxY > 0.792 || minY > 0.792) {
            pushTri(t.p0, t.p1, t.p2, t.n0, t.n1, t.n2, true);
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.computeBoundingSphere();
      return geo;
    };

    // 1. Build the 3 Glowing Mode Buttons (STATS, ITEMS, DATA) & Metallic Collars
    this.buttonConfigs.forEach((cfg, idx) => {
      const pivot = [cfg.x, cfg.y, cfg.z];

      // Metallic Collar Bezel
      const collarTris = buckets[`btn_collar_${idx}`];
      if (collarTris.length > 0) {
        const collarGeo = buildPartGeometry(collarTris, pivot, 0.0772);
        const collarMesh = new THREE.Mesh(collarGeo, this.collarMaterial);
        collarMesh.position.set(cfg.x, cfg.y, cfg.z);
        collarMesh.castShadow = true;
        collarMesh.receiveShadow = true;
        collarMesh.name = `PipBoyButtonCollar_${cfg.id}`;
        collarMesh.userData.partType = 'button';
        collarMesh.userData.buttonIndex = idx;
        collarMesh.userData.buttonId = cfg.id;
        this.partsGroup.add(collarMesh);
        this.collarMeshes.push(collarMesh);
        this.interactiveTargets.push(collarMesh);
      }

      // Inner Translucent Glowing Button Cap
      const capTris = buckets[`btn_cap_${idx}`];
      if (capTris.length > 0) {
        // UV radius 0.065 maps the top button lens (r=0.06385) cleanly across the 256x256 radial texture
        const capGeo = buildPartGeometry(capTris, pivot, 0.065);
        const capMesh = new THREE.Mesh(capGeo, this.buttonMaterials[idx]);
        capMesh.position.set(cfg.x, cfg.y, cfg.z);
        capMesh.castShadow = true;
        capMesh.receiveShadow = true;
        capMesh.name = `PipBoyButtonCap_${cfg.id}`;
        capMesh.userData.baseY = cfg.y;
        capMesh.userData.partType = 'button';
        capMesh.userData.buttonIndex = idx;
        capMesh.userData.buttonId = cfg.id;

        // Add subtle soft amber glow halo plane right on top of the button cap (local Y = +0.0505)
        const haloGeo = new THREE.PlaneGeometry(0.19, 0.19);
        const haloMat = new THREE.MeshBasicMaterial({
          map: this.haloTexture,
          transparent: true,
          opacity: idx === this.activeButtonIndex ? 0.16 : 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.rotation.x = -Math.PI / 2;
        haloMesh.position.set(0, 0.0505, 0);
        capMesh.add(haloMesh);
        this.buttonHaloSprites.push(haloMesh);

        this.partsGroup.add(capMesh);
        this.buttonMeshes.push(capMesh);
        this.interactiveTargets.push(capMesh);
      }
    });

    // 2. Build 360° Ridged Brass Thumb Scroll Wheel
    if (buckets.wheel.length > 0) {
      const wheelPivotPos = [-0.7850, 0.7849, -0.1314];
      const wheelGeo = buildPartGeometry(buckets.wheel, wheelPivotPos, null, true);
      const wheelMesh = new THREE.Mesh(wheelGeo, this.wheelMaterial);
      wheelMesh.castShadow = true;
      wheelMesh.receiveShadow = true;
      wheelMesh.name = 'PipBoyThumbWheel';
      wheelMesh.userData.partType = 'wheel';

      this.wheelPivot = new THREE.Group();
      this.wheelPivot.position.set(...wheelPivotPos);
      this.wheelPivot.add(wheelMesh);
      this.partsGroup.add(this.wheelPivot);
      this.interactiveTargets.push(wheelMesh);
    }

    // 3. Build Bottom-Left Rotary Mode Selector Knob & Brushed Steel Dial Plate
    if (buckets.dial_plate.length > 0) {
      const dialPivot = [-0.9209, 0.8550, 0.3327];
      const dialGeo = buildPartGeometry(buckets.dial_plate, dialPivot);
      this.dialPlateMesh = new THREE.Mesh(dialGeo, this.steelMaterial);
      this.dialPlateMesh.position.set(...dialPivot);
      this.dialPlateMesh.castShadow = true;
      this.dialPlateMesh.receiveShadow = true;
      this.dialPlateMesh.name = 'PipBoyRotaryDialPlate';
      this.dialPlateMesh.userData.partType = 'knob';
      this.partsGroup.add(this.dialPlateMesh);
      this.interactiveTargets.push(this.dialPlateMesh);
    }

    if (buckets.knob.length > 0) {
      const knobPivotPos = [-0.9209, 0.9400, 0.3327];
      const knobGeo = buildPartGeometry(buckets.knob, knobPivotPos);
      const knobMesh = new THREE.Mesh(knobGeo, this.knobMaterial);
      knobMesh.castShadow = true;
      knobMesh.receiveShadow = true;
      knobMesh.name = 'PipBoyRotaryKnob';
      knobMesh.userData.partType = 'knob';

      this.knobPivot = new THREE.Group();
      this.knobPivot.position.set(...knobPivotPos);
      this.knobPivot.add(knobMesh);
      this.partsGroup.add(this.knobPivot);
      this.interactiveTargets.push(knobMesh);
    }

    // 4. Build Top-Left Radiation Gauge Disc
    if (buckets.gauge_disc.length > 0) {
      const gaugePivot = [-0.9711, 0.8723, -0.5775];
      const gaugeGeo = buildPartGeometry(buckets.gauge_disc, gaugePivot, 0.1043);
      this.gaugeDiscMesh = new THREE.Mesh(gaugeGeo, this.gaugeMaterial);
      this.gaugeDiscMesh.position.set(...gaugePivot);
      this.gaugeDiscMesh.receiveShadow = true;
      this.gaugeDiscMesh.name = 'PipBoyRadiationGaugeDisc';
      this.gaugeDiscMesh.userData.partType = 'gauge';
      this.partsGroup.add(this.gaugeDiscMesh);
      this.interactiveTargets.push(this.gaugeDiscMesh);
    }

    // 5. Build Brushed Steel Screen Bezel Screws
    if (buckets.screws.length > 0) {
      const screwsGeo = buildPartGeometry(buckets.screws, [0, 0, 0]);
      const screwsMesh = new THREE.Mesh(screwsGeo, this.steelMaterial);
      screwsMesh.castShadow = true;
      screwsMesh.receiveShadow = true;
      screwsMesh.name = 'PipBoyBezelScrews';
      this.partsGroup.add(screwsMesh);
    }
  }

  /**
   * Fallback procedural geometry for the placeholder mesh before pipboy_wip.glb finishes loading
   */
  _buildFallbackParts() {
    this.buttonConfigs.forEach((cfg, idx) => {
      const collarGeo = new THREE.CylinderGeometry(0.077, 0.077, 0.06, 32);
      const collarMesh = new THREE.Mesh(collarGeo, this.collarMaterial);
      collarMesh.position.set(cfg.x, cfg.y, cfg.z);
      collarMesh.userData = { partType: 'button', buttonIndex: idx, buttonId: cfg.id };
      this.partsGroup.add(collarMesh);
      this.collarMeshes.push(collarMesh);
      this.interactiveTargets.push(collarMesh);

      const capGeo = new THREE.CylinderGeometry(0.064, 0.068, 0.08, 32);
      const capMesh = new THREE.Mesh(capGeo, this.buttonMaterials[idx]);
      capMesh.position.set(cfg.x, cfg.y + 0.025, cfg.z);
      capMesh.userData = {
        baseY: cfg.y + 0.025,
        partType: 'button',
        buttonIndex: idx,
        buttonId: cfg.id
      };
      this.partsGroup.add(capMesh);
      this.buttonMeshes.push(capMesh);
      this.interactiveTargets.push(capMesh);
    });
  }

  /**
   * Builds the "STATS   ITEMS   DATA" stenciled text above the 3 buttons
   * and the subtle warm orange PointLight over the active button.
   */
  _buildLabelsAndLighting() {
    // 1. Stenciled "STATS   ITEMS   DATA" text on the upper lip of the button housing
    // Uses MeshBasicMaterial so the transparent decal plane NEVER reflects specular scene light
    const labelGeo = new THREE.PlaneGeometry(0.62, 0.052);
    const labelMat = new THREE.MeshBasicMaterial({
      map: this.labelTexture,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      side: THREE.DoubleSide
    });

    this.labelMesh = new THREE.Mesh(labelGeo, labelMat);
    this.labelMesh.position.set(0.0500, 1.114, 0.258);
    // Rotate plane to lie parallel to the sloped XZ housing lip facing +Y (-90° - 14.7° slope)
    this.labelMesh.rotation.set(-Math.PI / 2 - THREE.MathUtils.degToRad(14.7), 0, 0);
    this.labelMesh.name = 'PipBoyModeLabelsStrip';
    this.partsGroup.add(this.labelMesh);

    // Individual invisible hitboxes over each of the 3 labels so clicking "STATS", "ITEMS", or "DATA" text works too
    this.buttonConfigs.forEach((cfg, idx) => {
      const hitGeo = new THREE.PlaneGeometry(0.18, 0.065);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(cfg.x, 1.116, 0.258);
      hitMesh.rotation.set(-Math.PI / 2 - THREE.MathUtils.degToRad(14.7), 0, 0);
      hitMesh.userData = {
        partType: 'button',
        buttonIndex: idx,
        buttonId: cfg.id
      };
      this.partsGroup.add(hitMesh);
      this.labelHitMeshes.push(hitMesh);
      this.interactiveTargets.push(hitMesh);
    });

    // 2. Subtle Warm Amber PointLight hovering just in front of the active button
    const activeCfg = this.buttonConfigs[this.activeButtonIndex] || this.buttonConfigs[0];
    this.buttonPointLight = new THREE.PointLight(0xff7b1a, 0.22, 0.48, 1.8);
    this.buttonPointLight.position.set(activeCfg.x, 1.19, activeCfg.z);
    this.partsGroup.add(this.buttonPointLight);
  }

  /**
   * Builds the 3D animated needle + glass cover on the top-left Radiation Gauge,
   * plus the "Pip-Boy" and "• Model 3000 •" plaques on the left louver panel.
   */
  _buildGaugeNeedleAndPlaques() {
    // 1. 3D Radiation Gauge Needle Pivot at center of top-left gauge (-0.9711, 0.875, -0.5775)
    this.gaugeNeedlePivot = new THREE.Group();
    this.gaugeNeedlePivot.position.set(-0.9711, 0.8755, -0.5775);

    // Needle pointer blade extending from center toward the right scale (+X)
    const needleGeo = new THREE.BoxGeometry(0.082, 0.003, 0.007);
    needleGeo.translate(0.032, 0, 0); // Pivot near base of needle
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0x181612,
      roughness: 0.3,
      metalness: 0.6
    });
    const needleMesh = new THREE.Mesh(needleGeo, needleMat);

    // Center brass/dark cap pin on needle pivot
    const pinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 16);
    const pinMesh = new THREE.Mesh(pinGeo, this.steelMaterial);
    needleMesh.add(pinMesh);

    this.gaugeNeedlePivot.add(needleMesh);
    this.gaugeNeedlePivot.rotation.y = this.gaugeBaseAngle;
    this.partsGroup.add(this.gaugeNeedlePivot);

    // Invisible interactive hitbox over the radiation gauge (no specular glare)
    const glassGeo = new THREE.CircleGeometry(0.103, 32);
    const glassMat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.rotation.x = -Math.PI / 2;
    glassMesh.position.set(-0.9711, 0.879, -0.5775);
    glassMesh.userData = { partType: 'gauge' };
    this.partsGroup.add(glassMesh);
    this.interactiveTargets.push(glassMesh);

    // 2. "Pip-Boy" script emblem above the left cooling louvers (X=-0.972, Y=0.858, Z=-0.340)
    const pipboyPlaqueTex = this._createPlaqueTexture('Pip-Boy', true);
    const pipboyPlaqueMat = new THREE.MeshBasicMaterial({
      map: pipboyPlaqueTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide
    });
    const pipboyPlaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.068), pipboyPlaqueMat);
    pipboyPlaqueMesh.rotation.x = -Math.PI / 2;
    pipboyPlaqueMesh.position.set(-0.972, 0.858, -0.340);
    this.partsGroup.add(pipboyPlaqueMesh);

    // 3. "• Model 3000 •" panel with 2 screws below the left cooling louvers (X=-0.978, Y=0.858, Z=0.067)
    const modelPlaqueMat = new THREE.MeshBasicMaterial({
      map: this.modelPlaqueTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide
    });
    const modelPlaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.052), modelPlaqueMat);
    modelPlaqueMesh.rotation.x = -Math.PI / 2;
    modelPlaqueMesh.position.set(-0.978, 0.858, 0.067);
    this.partsGroup.add(modelPlaqueMesh);
  }

  /**
   * Maps Pip-Boy mode name ('STATS', 'PROJECTS'/'ITEMS', 'DATA') to button index (0, 1, 2)
   */
  _tabToButtonIndex(tabName) {
    const upper = (tabName || 'STATS').toUpperCase();
    if (upper === 'PROJECTS' || upper === 'ITEMS' || upper === 'INV') return 1;
    if (upper === 'DATA' || upper === 'MAP' || upper === 'RADIO') return 2;
    return 0;
  }

  /**
   * Synchronizes the 3 glowing buttons, rotary knob, and gauge with the current screen state
   */
  syncWithScreenState(animate = true) {
    if (!this.screenCanvas) return;
    const btnIdx = this._tabToButtonIndex(this.screenCanvas.currentTab);
    const subIdx = this.screenCanvas.getCurrentSubTabIndex
      ? this.screenCanvas.getCurrentSubTabIndex()
      : 0;

    this.activateButton(btnIdx, animate);
    this.rotateKnobToSubTab(subIdx, animate);
  }

  /**
   * Depresses the physical 3D button at index (0=STATS, 1=ITEMS, 2=DATA),
   * transitions the warm orange incandescent glow + PointLight, and updates the backlit label.
   */
  activateButton(buttonIndex, animate = true) {
    const prevIndex = this.activeButtonIndex;
    this.activeButtonIndex = buttonIndex;

    // Update backlit "STATS   ITEMS   DATA" label strip
    this._renderButtonLabelsCanvas(buttonIndex);

    this.buttonConfigs.forEach((cfg, idx) => {
      const isLit = idx === buttonIndex;
      const mat = this.buttonMaterials[idx];
      const mesh = this.buttonMeshes[idx];
      const halo = this.buttonHaloSprites[idx];

      if (mat) {
        mat.map = isLit ? this.litButtonTexture : this.unlitButtonTexture;
        mat.emissiveMap = isLit ? this.litButtonTexture : this.unlitButtonTexture;
        mat.emissive.setHex(isLit ? 0xd95b12 : 0x661a04);
        mat.roughness = isLit ? 0.45 : 0.52;
        mat.needsUpdate = true;

        if (animate && gsap) {
          if (isLit) {
            // Subtle warm filament pulse on activation
            gsap.fromTo(
              mat,
              { emissiveIntensity: 0.62 },
              { emissiveIntensity: 0.42, duration: 0.42, ease: 'power2.out', overwrite: true }
            );
          } else {
            gsap.to(mat, {
              emissiveIntensity: 0.03,
              duration: 0.25,
              ease: 'power2.out',
              overwrite: true
            });
          }
        } else {
          mat.emissiveIntensity = isLit ? 0.42 : 0.03;
        }
      }

      if (halo) {
        if (animate && gsap) {
          gsap.to(halo.material, {
            opacity: isLit ? 0.16 : 0.0,
            duration: 0.28,
            ease: 'power2.out',
            overwrite: true
          });
        } else {
          halo.material.opacity = isLit ? 0.16 : 0.0;
        }
      }

      // Mechanical plunger press-in & spring-back animation on the clicked/activated button
      if (mesh && isLit && animate && gsap) {
        const baseY = mesh.userData.baseY ?? cfg.y;
        gsap.killTweensOf(mesh.position);
        gsap.timeline()
          .to(mesh.position, {
            y: baseY - 0.030, // Depress inward into collar along -Y
            duration: 0.08,
            ease: 'power3.in'
          })
          .to(mesh.position, {
            y: baseY,
            duration: 0.32,
            ease: 'back.out(2.4)'
          });
      }
    });

    // Move subtle warm PointLight to the active button
    const targetCfg = this.buttonConfigs[buttonIndex] || this.buttonConfigs[0];
    if (this.buttonPointLight) {
      if (animate && gsap) {
        gsap.to(this.buttonPointLight.position, {
          x: targetCfg.x,
          z: targetCfg.z,
          duration: 0.25,
          ease: 'power2.out'
        });
        gsap.fromTo(
          this.buttonPointLight,
          { intensity: 0.32 },
          { intensity: 0.22, duration: 0.42, ease: 'power2.out' }
        );
      } else {
        this.buttonPointLight.position.set(targetCfg.x, 1.19, targetCfg.z);
      }
    }

    if (animate && prevIndex !== buttonIndex) {
      this.pulseGauge(0.95);
    }
  }

  /**
   * Rotates the bottom-left physical Rotary Knob & Pointer to align with the active subtab's tick mark (0..4)
   */
  rotateKnobToSubTab(subTabIndex = 0, animate = true) {
    if (!this.knobPivot) return;
    const clampedIdx = Math.max(0, Math.min(4, subTabIndex));
    // Each tick mark around the rotary dial is spaced ~22 degrees clockwise
    const targetAngleY = -THREE.MathUtils.degToRad(clampedIdx * 22);

    if (animate && gsap) {
      gsap.to(this.knobPivot.rotation, {
        y: targetAngleY,
        duration: 0.36,
        ease: 'back.out(2.1)',
        overwrite: true
      });
    } else {
      this.knobPivot.rotation.y = targetAngleY;
    }
  }

  /**
   * Spins the left ridged brass Thumb Scroll Wheel by `steps` notches
   */
  spinWheel(steps = 1) {
    if (!this.wheelPivot) return;
    const stepAngle = 0.44; // ~25 degrees per notch
    this.wheelRotationX += steps * stepAngle;

    if (gsap) {
      gsap.to(this.wheelPivot.rotation, {
        x: this.wheelRotationX,
        duration: 0.34,
        ease: 'back.out(1.6)',
        overwrite: true
      });
    } else {
      this.wheelPivot.rotation.x = this.wheelRotationX;
    }
  }

  /**
   * Deflects the top-left Radiation Gauge needle with a damped spring spike
   */
  pulseGauge(intensity = 0.7) {
    if (!gsap) return;
    const targetSpike = Math.min(1.25, 0.45 * intensity + Math.random() * 0.25);
    gsap.killTweensOf(this.gaugeSpikeOffset);
    gsap.timeline()
      .to(this.gaugeSpikeOffset, {
        value: targetSpike,
        duration: 0.11,
        ease: 'power3.out'
      })
      .to(this.gaugeSpikeOffset, {
        value: -0.08 * intensity,
        duration: 0.18,
        ease: 'sine.inOut'
      })
      .to(this.gaugeSpikeOffset, {
        value: 0,
        duration: 0.55,
        ease: 'elastic.out(1.1, 0.35)'
      });
  }

  /**
   * Triggered when the Pip-Boy powers on or toggles zoom mode
   */
  triggerAccessAnimation() {
    this.spinWheel(2);
    this.pulseGauge(1.2);
  }

  /**
   * Continuous frame update for subtle incandescent filament breathing and Geiger needle micro-jitter
   */
  update(elapsedTime = performance.now() * 0.001) {
    // 1. Subtle incandescent lamp breathing on the active button
    const activeMat = this.buttonMaterials[this.activeButtonIndex];
    if (activeMat && (!gsap || !gsap.isTweening(activeMat))) {
      const breath = Math.sin(elapsedTime * 4.2) * 0.025 + Math.sin(elapsedTime * 13.7) * 0.01;
      activeMat.emissiveIntensity = 0.42 + breath;
    }

    // 2. Continuous Geiger counter needle micro-tremble + interaction spike deflection
    if (this.gaugeNeedlePivot) {
      const microJitter =
        Math.sin(elapsedTime * 19.0) * 0.022 +
        Math.cos(elapsedTime * 31.0) * 0.014 +
        Math.sin(elapsedTime * 3.3) * 0.035;
      this.gaugeNeedlePivot.rotation.y =
        this.gaugeBaseAngle - this.gaugeSpikeOffset.value + microJitter;
    }
  }

  /**
   * Handles a raycast click on any of the interactive 3D physical parts
   */
  handlePartClick(hitObject) {
    if (!hitObject) return false;

    let obj = hitObject;
    while (obj && !obj.userData?.partType && obj.parent) {
      obj = obj.parent;
    }
    const partType = obj?.userData?.partType;
    if (!partType) return false;

    if (partType === 'button') {
      const btnId = obj.userData.buttonId || 'STATS';
      const btnIdx = obj.userData.buttonIndex ?? 0;
      this.activateButton(btnIdx, true);
      if (this.screenCanvas) {
        this.screenCanvas.switchTab(btnId);
      }
      if (this.onModeSelect) {
        this.onModeSelect(btnId, btnIdx);
      }
      return true;
    }

    if (partType === 'wheel') {
      this.spinWheel(1);
      this.pulseGauge(0.5);
      if (this.screenCanvas && typeof this.screenCanvas.stepSelection === 'function') {
        this.screenCanvas.stepSelection(1);
      } else {
        pipboyAudio.playClick();
      }
      if (this.onModeSelect) {
        this.onModeSelect('WHEEL', 1);
      }
      return true;
    }

    if (partType === 'knob') {
      if (this.screenCanvas && typeof this.screenCanvas.cycleSubTab === 'function') {
        this.screenCanvas.cycleSubTab(1);
      } else {
        pipboyAudio.playSubCategoryChange();
      }
      this.pulseGauge(0.65);
      if (this.onModeSelect) {
        this.onModeSelect('KNOB', 1);
      }
      return true;
    }

    if (partType === 'gauge') {
      this.pulseGauge(1.3);
      pipboyAudio.playStaticBurst(0.18, 0.22);
      if (this.onModeSelect) {
        this.onModeSelect('GAUGE', 1);
      }
      return true;
    }

    return false;
  }
}

import { pipboyAudio } from './audio.js';

/**
 * Flutter-style EdgeInsets helper to configure padding with top, left, right, bottom
 */
export class EdgeInsets {
  static only({ top = 0, left = 0, right = 0, bottom = 0 } = {}) {
    return { top, left, right, bottom };
  }

  static all(value = 0) {
    return { top: value, left: value, right: value, bottom: value };
  }

  static symmetric({ vertical = 0, horizontal = 0 } = {}) {
    return { top: vertical, bottom: vertical, left: horizontal, right: horizontal };
  }

  static from(padding) {
    if (typeof padding === 'number') {
      return EdgeInsets.all(padding);
    }
    return {
      top: padding?.top ?? 32,
      left: padding?.left ?? 32,
      right: padding?.right ?? 32,
      bottom: padding?.bottom ?? 76
    };
  }
}

/**
 * Pip-Boy 3000 (Model 3000) Screen Canvas - Fallout: New Vegas CRT Styling
 */
export class PipBoyScreenCanvas {
  constructor(padding = { top: 32, left: 32, right: 32, bottom: 76 }) {
    this.padding = EdgeInsets.from(padding);
    this.ambientRollY = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.ctx = this.canvas.getContext('2d');

    // Re-render when monofonto or custom fonts finish loading
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        this.render();
      });
    }

    // Fallout: New Vegas 3 Primary Modes & Subtabs (Mapped to Portfolio)
    this.currentTab = 'STATS'; // STATS | PROJECTS | DATA
    this.currentSubTab = 'Status'; // Status, S.P.E.C.I.A.L., Skills, Perks, General

    // Fallout: New Vegas Authentic Green Phosphor CRT Theme (Toned-down natural glow)
    this.theme = {
      main: '#18dc22',
      glow: 'rgba(24, 220, 34, 0.32)',
      dim: 'rgba(24, 220, 34, 0.16)',
      bg: '#020b02',
      glassTint: 'rgba(24, 220, 34, 0.024)',
      scanline: 'rgba(0, 0, 0, 0.25)'
    };

    // Portfolio Status Categories (Left Column in Status View)
    this.hardcoreStats = ['BIO', 'FLTR', 'AI', 'SDK', 'NATV', 'CICD'];
    this.hardcoreDescriptions = [
      'Mobile Engineer based in Barcelona, Spain | vladicicre@gmail.com | +34 602 021 151',
      'Flutter & Dart: Cross-platform apps, state management, Widgetbook design systems',
      'On-Device AI: Local LLM inference, tool-calling, TTFT & tokens/sec benchmarking',
      'Cross-Platform SDKs: Adapter & Builder patterns across pub.dev, SPM, Maven & Unity',
      'Native Mobile: Android (Kotlin/Java) & iOS (Swift) development and optimization',
      'CI/CD & QA: Fastlane automation, unit & integration tests, Mockito & BrowserStack'
    ];
    this.selectedHardcoreIndex = 0; // 'BIO' active

    // Character / Portfolio Vitals
    this.birthDate = { year: 2001, month: 2, day: 8 }; // 08/02/2001 (DD/MM/YYYY)
    this.randomXp = Math.floor(10000 + Math.random() * 90000);
    this.playerName = 'Vladyslav Humennyi - Mobile Engineer';
    this.vitals = {
      lvl: 5,
      age: this._calculateAge(),
      xp: `${this.randomXp}/∞`,
      loc: 'BARCELONA, ES',
      role: 'MOBILE ENG',
      exp: '2021-2026',
      deg: 'M.SC. CS',
      email: 'vladicicre@gmail.com',
      phone: '+34 602 021 151',
      linkedin: 'https://www.linkedin.com/in/villad-dev/'
    };

    // S.P.E.C.I.A.L. Core Engineering Attributes
    this.special = [
      {
        k: 'FLUTTER & DART',
        val: 10,
        subtitle: 'Cross-Platform & Design Systems',
        desc: 'Production mobile development using Flutter and Dart. Reusable app architecture, state management, dynamic tournament brackets, payment workflows, and scalable Widgetbook design systems.'
      },
      {
        k: 'NATIVE MOBILE',
        val: 9,
        subtitle: 'Android (Kotlin/Java) & iOS (Swift)',
        desc: 'Native iOS and Android development using Swift, Kotlin, Java, iOS SDK, and Android SDK. Platform-specific abstractions, UI/UX adaptation, and runtime performance optimization.'
      },
      {
        k: 'SDK ARCHITECT',
        val: 9,
        subtitle: 'Flutter, Kotlin, Swift & Unity SDKs',
        desc: 'Built and maintained cross-platform advertisement and analytics SDKs using Adapter and Builder patterns. Automated multi-ecosystem releases across pub.dev, Swift Package Manager, Maven Central, and Unity Package Manager.'
      },
      {
        k: 'ON-DEVICE AI',
        val: 9,
        subtitle: 'Offline Inference & Benchmarking',
        desc: 'Implemented local AI inference layers with integrated tool-calling for offline, low-latency workflows. Designed monitoring pipelines tracking TTFT (Time To First Token), tokens/sec, temperature behavior, and model efficiency.'
      },
      {
        k: 'CI/CD & TESTING',
        val: 9,
        subtitle: 'Fastlane, Mockito & BrowserStack',
        desc: 'Built and maintained CI/CD pipelines using Fastlane to automate mobile builds, code signing, and deployments to Google Play and Apple App Store. Unit and integration testing with Mockito and BrowserStack.'
      },
      {
        k: 'UNITY & 3D DEV',
        val: 8,
        subtitle: 'C#, 2D/3D Graphics & Ad SDKs',
        desc: 'Worked with 2D and 3D graphics in Unity and C#, contributing to gameplay concepts, core mechanics, UI/UX adaptation, and cross-platform monetization SDK integrations.'
      },
      {
        k: 'BACKEND & APIS',
        val: 8,
        subtitle: 'REST APIs, Firebase & OAuth',
        desc: 'Experienced in building and integrating backend services for mobile applications, including REST APIs, Firebase, Google OAuth authentication, payment gateways, and third-party analytics.'
      }
    ];
    this.selectedSpecialIndex = 0;

    // Technical Skills
    this.skills = [
      { name: 'FLUTTER / DART', val: 98 },
      { name: 'KOTLIN / ANDROID', val: 90 },
      { name: 'SWIFT / iOS SDK', val: 88 },
      { name: 'CROSS-PLAT SDKS', val: 95 },
      { name: 'ON-DEVICE AI', val: 90 },
      { name: 'MOBILE ARCH', val: 94 },
      { name: 'FASTLANE / CI/CD', val: 92 },
      { name: 'UNITY / C#', val: 84 },
      { name: 'FIREBASE / REST', val: 92 },
      { name: 'UNIT / UI TESTS', val: 88 },
      { name: 'WIDGETBOOK / UI', val: 90 },
      { name: 'PYTHON / JAVA', val: 82 },
      { name: 'PERF OPTIMIZE', val: 92 },
      { name: 'AGILE / SCRUM', val: 95 }
    ];

    // Perks
    this.perks = [
      {
        name: 'M.SC. IN MOBILE ENGINEERING (10/2022 - 07/2024)',
        desc: 'Polish-Japanese Academy of Information Technology — Master\'s Degree in Mobile Engineering.'
      },
      {
        name: 'B.SC. IN COMPUTER SCIENCE (10/2018 - 06/2021)',
        desc: 'University of Lodz — Bachelor\'s Degree in Computer Science.'
      },
      {
        name: 'LOCAL AI INFERENCE & BENCHMARKING',
        desc: 'Offline on-device AI tool-calling, TTFT & tokens-per-second telemetry pipelines at Multiverse Computing.'
      },
      {
        name: 'MULTI-ECOSYSTEM SDK AUTOMATION',
        desc: 'Adapter & Builder SDKs shipped to pub.dev, Swift Package Manager, Maven Central & Unity Package Manager.'
      },
      {
        name: 'MULTILINGUAL GLOBAL ENGINEER',
        desc: 'Ukrainian (C1) · English (B2) · Russian (B2) · Spanish (A2) — Based in Barcelona, Spain.'
      }
    ];

    // Projects (Intentionally left empty so projects can be added later)
    // Format when adding later: { name: 'PROJECT NAME', cat: 'Mobile', tech: 'Flutter, Dart', period: '2026', desc: '...' }
    this.selectedInvIndex = 0;
    this.projects = [];

    // Professional Experience (Quests view in DATA mode)
    this.selectedQuestIndex = 0;
    this.quests = [
      {
        title: 'MULTIVERSE COMPUTING',
        role: 'Mobile Engineer',
        period: '12/2025 - 07/2026',
        status: 'RECENT',
        obj: [
          'Implemented a local AI inference layer with integrated tool-calling capabilities for offline, low-latency workflows.',
          'Designed AI performance monitoring pipelines collecting TTFT (Time To First Token), tokens/sec, temperature & efficiency.',
          'Optimized AI model integration by benchmarking inference performance and validating response quality across models.',
          'Built and maintained CI/CD pipelines using Fastlane for automated builds, code signing, and store deployments.',
          'Built and scaled a reusable design system using Widgetbook to improve UI consistency and team collaboration.'
        ]
      },
      {
        title: 'BIDSCUBE',
        role: 'SDK/Mobile Engineer',
        period: '07/2025 - 12/2025',
        status: 'COMPLETED',
        obj: [
          'Developed a revenue management app focused on analytics, monetization workflows, and operational efficiency.',
          'Built and maintained cross-platform SDKs for advertisement integration using Flutter, Kotlin, Swift, and Unity.',
          'Automated SDK release and distribution pipelines across pub.dev, Swift Package Manager, Maven Central, and Unity Package Manager.',
          'Designed advertisement SDKs using Adapter and Builder patterns with reusable APIs and platform-specific abstractions.'
        ]
      },
      {
        title: 'FITOFAN',
        role: 'Middle Flutter Engineer',
        period: '09/2024 - 06/2025',
        status: 'COMPLETED',
        obj: [
          'Developed a social networking platform for athletes and sports communities focused on event management and engagement.',
          'Implemented event registration and participation payment flows for joining tournaments and managing event access.',
          'Integrated Google OAuth authentication for secure and streamlined user sign-in and account management.',
          'Built dynamic tournament bracket systems for organizing and displaying competition progress, match structures, and results.'
        ]
      },
      {
        title: 'FREELANCE | UPWORK',
        role: 'Mobile Developer',
        period: '11/2022 - 08/2024',
        status: 'COMPLETED',
        obj: [
          'Developed 3 mobile applications for the North American market using Flutter and Dart from requirements to production.',
          'Built reusable application architecture integrating REST APIs, authentication, Firebase, payments, and analytics.',
          'Implemented Flutter unit and integration tests using Mockito and BrowserStack.',
          'Set up automated build and deployment workflows, managing releases through Google Play and Apple App Store.'
        ]
      },
      {
        title: 'OFFROAD DEVELOPMENT',
        role: 'Game/Mobile Engineer',
        period: '04/2021 - 10/2022',
        status: 'COMPLETED',
        obj: [
          'Developed mobile applications and games according to technical specifications, business requirements, and timelines.',
          'Collaborated with distributed teams across the globe on mobile games and applications.',
          'Worked with 2D and 3D graphics, contributing to gameplay concepts, UI/UX ideas, and core game mechanics design.',
          'Integrated advertisement and monetization solutions including Google AdSense and mobile ad SDKs.'
        ]
      }
    ];

    // Education & Languages (Education subtab in DATA mode)
    this.selectedEduIndex = 0;
    this.education = [
      {
        title: 'POLISH-JAPANESE ACADEMY (PJATK)',
        degree: 'Master\'s Degree in Mobile Engineering',
        period: '10/2022 - 07/2024',
        details: [
          'Specialized in mobile application architecture, cross-platform & native mobile development, and performance optimization.',
          'Focused on modern software deployment, SDK engineering, and emerging mobile technologies.'
        ]
      },
      {
        title: 'UNIVERSITY OF LODZ',
        degree: 'Bachelor\'s Degree in Computer Science',
        period: '10/2018 - 06/2021',
        details: [
          'Core computer science curriculum covering algorithms, data structures, object-oriented programming, and databases.',
          'Built foundations in software engineering, 2D/3D graphics, and distributed team collaboration.'
        ]
      },
      {
        title: 'LANGUAGES & COMMUNICATION',
        degree: 'Spoken Languages Proficiency',
        period: 'GLOBAL',
        details: [
          'Ukrainian: C1 (Advanced / Native proficiency)',
          'English: B2 (Upper-Intermediate professional working proficiency)',
          'Russian: B2 (Upper-Intermediate proficiency)',
          'Spanish: A2 (Elementary proficiency — based in Barcelona, Spain)'
        ]
      }
    ];

    // Career Map Locations
    this.selectedMapLocIndex = 0;
    this.mapLocations = [
      { name: 'BARCELONA, SPAIN', x: 250, y: 270, role: 'Current Base | Multiverse Computing (Mobile Engineer, 12/2025 - 07/2026)' },
      { name: 'WARSAW, POLAND', x: 600, y: 145, role: 'Polish-Japanese Academy of IT | M.Sc. in Mobile Engineering (2022 - 2024)' },
      { name: 'LODZ, POLAND', x: 520, y: 205, role: 'University of Lodz | B.Sc. in Computer Science (2018 - 2021)' },
      { name: 'BIDSCUBE / FITOFAN', x: 430, y: 295, role: 'SDK/Mobile Engineer (2025) & Middle Flutter Engineer (2024 - 2025)' },
      { name: 'NORTH AMERICA (REMOTE)', x: 160, y: 155, role: 'Upwork Freelance Mobile Developer | 3 Production Flutter Apps (2022 - 2024)' }
    ];

    // Contact Channels (Radio / Comms subtab in DATA mode)
    this.selectedRadioIndex = 0;
    this.radioStations = [
      {
        name: 'LINKEDIN // VILLAD-DEV',
        freq: 'IN/VILLAD',
        dj: 'https://www.linkedin.com/in/villad-dev/',
        url: 'https://www.linkedin.com/in/villad-dev/'
      },
      {
        name: 'EMAIL // VLADICICRE',
        freq: 'GMAIL',
        dj: 'vladicicre@gmail.com — Direct Electronic Mail',
        url: 'mailto:vladicicre@gmail.com'
      },
      {
        name: 'PHONE // BARCELONA',
        freq: '+34 ES',
        dj: '+34 602 021 151 — Direct Mobile Line (Spain)',
        url: 'tel:+34602021151'
      },
      {
        name: 'LOCATION // BARCELONA',
        freq: 'BCN, ES',
        dj: 'Barcelona, Spain — Open to Mobile & SDK Engineering',
        url: null
      }
    ];

    // Animation & Oscilloscope state
    this.wavePhase = 0;
    this.scanY = 0;
    this.hitboxes = [];

    // Non-static CRT Screen Sweep/Glitch Animation State (random animation every ~10s)
    this.activeScreenAnim = null;
    this.lastAnimType = -1;
    this.nextAnimTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 10000;

    // Tab Crossfade / Phosphor Decay Canvas
    this.prevFrameCanvas = document.createElement('canvas');
    this.prevFrameCanvas.width = 1024;
    this.prevFrameCanvas.height = 768;
    this.prevFrameCtx = this.prevFrameCanvas.getContext('2d');
    this.tabCrossfade = null;

    // Avatar image state
    this.avatarLoaded = false;
    this.avatarCanvas = null;
    this._initAvatar();
  }

  /**
   * Initializes the avatar PNG image from assets/images
   */
  _initAvatar() {
    const trySources = [
      './assets/images/avatar.png',
      'assets/images/avatar.png'
    ];
    let idx = 0;

    const loadNext = () => {
      if (idx >= trySources.length) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this._prepareAvatarCanvases(img);
        this.avatarLoaded = true;
      };
      img.onerror = () => {
        idx++;
        loadNext();
      };
      img.src = trySources[idx];
    };

    loadNext();
  }

  /**
   * Caches avatar image onto an offscreen canvas and applies a Pip-Boy phosphor green color filter
   * so white/grey contour highlights match the exact Pip-Boy theme green (#18dc22),
   * and ensures any dark/black background is keyed out to clean transparency.
   */
  _prepareAvatarCanvases(img) {
    const naturalW = img.naturalWidth || img.width || 941;
    const naturalH = img.naturalHeight || img.height || 1672;

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = naturalW;
    baseCanvas.height = naturalH;
    const bCtx = baseCanvas.getContext('2d');
    bCtx.drawImage(img, 0, 0);

    // Apply per-pixel Pip-Boy green color filter and transparent alpha for black backgrounds
    try {
      const imgData = bCtx.getImageData(0, 0, naturalW, naturalH);
      const data = imgData.data;
      // Target Pip-Boy phosphor green RGB (#18dc22 -> 24, 220, 34)
      const targetR = 24;
      const targetG = 220;
      const targetB = 34;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const maxVal = Math.max(r, g, b);
        // Key out black / near-black background pixels to pure transparency
        if (a === 0 || maxVal < 18) {
          data[i + 3] = 0;
        } else {
          // Normalize brightness and map contours to glowing phosphor green
          const brightness = maxVal / 255;
          const shade = 0.4 + 0.6 * brightness;
          data[i] = Math.round(targetR * shade);
          data[i + 1] = Math.round(targetG * shade);
          data[i + 2] = Math.round(targetB * shade);
          data[i + 3] = Math.min(255, Math.round(255 * Math.min(1, brightness * 1.6)));
        }
      }
      bCtx.putImageData(imgData, 0, 0);
    } catch (err) {
      // Fallback canvas composite tint if getImageData is restricted
      bCtx.globalCompositeOperation = 'source-atop';
      bCtx.fillStyle = this.theme?.main || '#18dc22';
      bCtx.fillRect(0, 0, naturalW, naturalH);
      bCtx.globalCompositeOperation = 'source-over';
    }

    this.avatarCanvas = baseCanvas;
  }

  getTheme() {
    return this.theme;
  }

  /**
   * Calculates precise age based on birthday 08/02/2001 (DD/MM/YYYY)
   */
  _calculateAge() {
    const today = new Date();
    const birthYear = 2001;
    const birthMonth = 1; // 0-indexed: February = 1
    const birthDay = 8;

    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return age;
  }

  setPadding(padding) {
    this.padding = EdgeInsets.from(padding);
  }

  /**
   * Main render loop executed every animation frame
   */
  render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const theme = this.getTheme();

    this.hitboxes = []; // Reset clickable hitboxes

    // 1. Deep Phosphor CRT Background
    this.ctx.fillStyle = theme.bg;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Subtle CRT glass radial glow
    const radGrad = this.ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 1.3);
    radGrad.addColorStop(0, theme.glassTint);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    this.ctx.fillStyle = radGrad;
    this.ctx.fillRect(0, 0, width, height);

    // 3. Top Header Bar (STATS ─── LVL 11  HP 269/270 ... ───)
    this._drawHeader(width, theme);

    // 4. Main Body Content View based on Mode & Subtab
    if (this.currentTab === 'STATS') {
      if (this.currentSubTab.toLowerCase() === 'status') {
        this._drawStatusView(width, height, theme);
      } else if (this.currentSubTab.toLowerCase() === 's.p.e.c.i.a.l.') {
        this._drawSpecialView(width, height, theme);
      } else if (this.currentSubTab.toLowerCase() === 'skills') {
        this._drawSkillsView(width, height, theme);
      } else if (this.currentSubTab.toLowerCase() === 'perks') {
        this._drawPerksView(width, height, theme);
      } else {
        this._drawGeneralView(width, height, theme);
      }
    } else if (this.currentTab === 'PROJECTS' || this.currentTab === 'ITEMS') {
      this._drawProjectsView(width, height, theme);
    } else if (this.currentTab === 'DATA') {
      const sub = this.currentSubTab.toLowerCase();
      if (sub.includes('map')) {
        this._drawMapView(width, height, theme);
      } else if (sub === 'radio' || sub === 'contact') {
        this._drawRadioView(width, height, theme);
      } else {
        this._drawQuestsView(width, height, theme);
      }
    }

    // 5. Bottom Subtabs Bar ([ Status ] ─── S.P.E.C.I.A.L. ─── Skills ─── ...)
    this._drawBottomSubtabs(width, height, theme);

    // 5b. Tab Switch CRT Phosphor Crossfade & Sync Shimmer
    if (this.tabCrossfade) {
      this._drawTabCrossfade(width, height, theme);
    }

    // 6. Periodic (~10s) Random CRT Screen Animations
    this._drawScreenAnimations(width, height, theme);

    // 7. CRT Scanlines Overlay
    this._drawScanlines(width, height, theme);
  }

  /**
   * Draws a vertical corner rule starting solid at (x, cornerY) and fading to transparent at (x, endY)
   */
  _drawCornerVerticalFade(x, cornerY, endY, theme) {
    const vertGrad = this.ctx.createLinearGradient(x, cornerY, x, endY);
    vertGrad.addColorStop(0, theme.main);
    vertGrad.addColorStop(1, 'transparent');

    this.ctx.strokeStyle = vertGrad;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, cornerY);
    this.ctx.lineTo(x, endY);
    this.ctx.stroke();
  }

  /**
   * Top Header Bar:
   */
  _drawHeader(width, theme) {
    const { top, left, right } = this.padding;
    const lineY = top + 10;
    const titleY = lineY + 11;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 3;

    // 1. Top-left vertical rule with fade-out at bottom end
    this._drawCornerVerticalFade(left, lineY, lineY + 55, theme);

    // 2. Active Category Title: STATS / ITEMS / DATA (larger authentic font)
    const titleText = this.currentTab;
    this.ctx.font = 'bold 34px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = theme.main;
    const titleX = left + 46;
    this.ctx.fillText(titleText, titleX, titleY);
    const titleW = this.ctx.measureText(titleText).width;

    // Short horizontal bar from top-left corner to title
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(left, lineY);
    this.ctx.lineTo(titleX - 12, lineY);
    this.ctx.stroke();

    // 3. Header Stat Blocks with gaps and half-rectangle elements (───┐)
    let blocks = [];
    if (this.currentTab === 'STATS') {
      const currentAge = this._calculateAge();
      blocks = [
        { label: 'LVL', val: `${this.vitals.lvl}`, w: 110 },
        { label: 'AGE', val: `${currentAge}`, w: 120 },
        { label: 'XP', val: `${this.vitals.xp}`, w: 220 }
      ];
    } else if (this.currentTab === 'PROJECTS' || this.currentTab === 'ITEMS') {
      blocks = [
        { label: 'STATUS', val: 'OPEN TO WORK', w: 200 },
        { label: 'BASE', val: 'BARCELONA', w: 180 },
        { label: 'ROLE', val: 'MOBILE ENG', w: 170 },
        { label: 'YEARS', val: '5+ YRS', w: 120 }
      ];
    } else {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = String(now.getFullYear()).slice(-2);
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      blocks = [
        { label: 'PORTFOLIO DATA', val: 'BARCELONA', w: 270 },
        { label: 'DATE', val: `${d}.${m}.${y}`, w: 170 },
        { label: 'TIME', val: `${hrs}:${mins}`, w: 150 }
      ];
    }

    const gap = 10;
    const totalBlocksW = blocks.reduce((sum, b) => sum + b.w, 0) + gap * (blocks.length - 1);
    let currStartX = width - right - totalBlocksW;
    const afterTitleX = titleX + titleW + 14;
    const statTextY = lineY + 25;
    const tickDropH = 28;

    this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';

    blocks.forEach((blk, idx) => {
      const boxLeft = currStartX;
      const boxRight = idx === blocks.length - 1 ? (width - right) : (currStartX + blk.w);
      // First block's top horizontal line connects all the way from STATS title
      const lineStartX = idx === 0 ? afterTitleX : boxLeft;

      // Top horizontal line of the half-rectangle
      this.ctx.strokeStyle = theme.main;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(lineStartX, lineY);
      this.ctx.lineTo(boxRight, lineY);
      this.ctx.stroke();

      // Right vertical drop of the half-rectangle (faded at bottom end)
      if (idx === blocks.length - 1) {
        // Far-right screen corner vertical fade
        this._drawCornerVerticalFade(boxRight, lineY, lineY + 55, theme);
      } else {
        // Stat block right vertical drop with subtle bottom fade
        this._drawCornerVerticalFade(boxRight, lineY, lineY + tickDropH, theme);
      }

      // Label on left of block, Value right-aligned near the vertical drop
      this.ctx.fillStyle = theme.main;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(blk.label, boxLeft + 6, statTextY);

      if (blk.val) {
        this.ctx.textAlign = 'right';
        this.ctx.fillText(blk.val, boxRight - 8, statTextY);
      }

      currStartX = boxRight + gap;
    });

    this.ctx.textAlign = 'left';

    // Interactive hitbox for switching modes: STATS -> PROJECTS -> DATA
    this.hitboxes.push({
      x: left, y: top - 8, w: 50 + titleW + 20, h: 40,
      action: () => {
        const order = ['STATS', 'PROJECTS', 'DATA'];
        const next = order[(order.indexOf(this.currentTab) + 1) % order.length];
        this.switchTab(next);
      }
    });

    this.ctx.restore();
  }

  /**
   * STATS -> Status View (Exact Fallout: New Vegas Screenshot Replica)
   * Left: CND, RAD, EFF, H2O, FOD, SLP
   * Center: Outstretched Vault Boy with CND bars around head, torso, arms, legs
   * Underneath: Mothman - Level 11
   * Right: (15) Stimpak A), (2) Doctor's Bag Y), Limbs X)
   */
  _drawStatusView(width, height, theme) {
    const { top, left, right, bottom } = this.padding;
    const contentY = top + 42;
    const footerY = height - bottom - 25;
    const centerY = contentY + (footerY - contentY) * 0.45;
    const centerX = width / 2;

    this.ctx.save();

    // 1. Left Column - Hardcore stats list (bigger font, authentic selection box)
    this.ctx.font = 'bold 24px "monofonto", "Share Tech Mono", monospace';
    const startY = contentY + 62;

    this.hardcoreStats.forEach((st, i) => {
      const sy = startY + i * 46;
      const isSel = this.selectedHardcoreIndex === i;

      if (isSel) {
        // Active stat enclosed in green outline box: [ CND ]
        this.ctx.strokeStyle = theme.main;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = theme.glow;
        this.ctx.shadowBlur = 3;
        this.ctx.strokeRect(left + 2, sy - 24, 68, 34);
        this.ctx.fillStyle = theme.dim;
        this.ctx.fillRect(left + 2, sy - 24, 68, 34);
        this.ctx.fillStyle = theme.main;
      } else {
        this.ctx.fillStyle = 'rgba(26, 255, 36, 0.72)';
        this.ctx.shadowBlur = 4;
      }

      this.ctx.fillText(st, left + 14, sy);

      this.hitboxes.push({
        x: left + 2, y: sy - 24, w: 68, h: 34,
        action: () => {
          const dir = i >= this.selectedHardcoreIndex ? 1 : -1;
          this.selectedHardcoreIndex = i;
          pipboyAudio.playClick();
          this._emitInteraction('item', { direction: dir });
        }
      });
    });

    // 2. Center - Authentic Fallout: New Vegas Vault Boy & Condition Bars
    this._drawNewVegasVaultBoy(centerX, centerY, theme);

    // Character Name & Level beneath Vault Boy (larger font)
    this.ctx.font = 'bold 24px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = theme.main;
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 3;
    const nameY = Math.min(footerY - 6, centerY + 252);
    this.ctx.fillText(this.playerName, centerX, nameY);
    this.ctx.textAlign = 'left';

    // 3. Right Column - Quick Contacts & LinkedIn
    const hotkeys = [
      { label: 'LinkedIn', key: 'IN', dim: false, url: 'https://www.linkedin.com/in/villad-dev/' },
      { label: 'Email', key: '@', dim: false, url: 'mailto:vladicicre@gmail.com' },
      { label: 'Resume PDF', key: 'CV', dim: false, url: null }
    ];
    this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';
    const rightEdge = width - right - 12;

    hotkeys.forEach((hk, idx) => {
      const ay = contentY + 48 + idx * 42;
      const color = hk.dim ? 'rgba(26, 255, 36, 0.45)' : theme.main;
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = color;
      this.ctx.shadowBlur = hk.dim ? 2 : 6;

      // Key letter & right curved bracket A) Y) X)
      const keyCenterX = rightEdge - 16;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(hk.key, keyCenterX, ay);

      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(keyCenterX + 1, ay - 7, 15, -Math.PI * 0.42, Math.PI * 0.42);
      this.ctx.stroke();

      // Action label right-aligned to the left of the hotkey badge
      this.ctx.textAlign = 'right';
      this.ctx.fillText(hk.label, keyCenterX - 22, ay);

      this.hitboxes.push({
        x: rightEdge - 240, y: ay - 22, w: 240, h: 32,
        action: () => {
          pipboyAudio.playClick();
          if (hk.url && typeof window !== 'undefined') {
            window.open(hk.url, '_blank', 'noopener,noreferrer');
          } else if (hk.key === 'CV') {
            this.switchTab('STATS', 'Perks');
          }
        }
      });
    });

    this.ctx.textAlign = 'left';
    this.ctx.restore();
  }

  /**
   * Pip-Boy status avatar using the authentic image from assets/images
   * (scaled to fit cleanly inside the screen with Pip-Boy green contour filter)
   */
  _drawNewVegasVaultBoy(centerX, centerY, theme) {
    const avatarCanvas = this.avatarCanvas;

    // Sized to fit cleanly between header bar and player name at the bottom without cutting boots
    const targetHeight = 540;
    const targetWidth = Math.round(targetHeight * (941 / 1672)); // ~304px
    const drawX = Math.round(centerX - targetWidth / 2);
    // Positioned so the head sits comfortably below the header and boots reach exactly above the name
    const drawY = 32;

    if (avatarCanvas) {
      this.ctx.save();
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = 'transparent';
      this.ctx.drawImage(avatarCanvas, drawX, drawY, targetWidth, targetHeight);
      this.ctx.restore();
    }

    // ─── CND Condition Brackets (Framed around head, torso, arms, and legs) ───
    // Head bar (centered directly above head)
    this._drawConditionBar(centerX - 34, drawY + 82, 68, 14, 1.0, theme, 10, 10);

    // Torso bar (centered across chest)
    this._drawConditionBar(centerX - 34, drawY + 238, 68, 14, 0.95, theme, 6, 6);

    // Left Arm bar (viewer's left, above thumb-up arm)
    this._drawConditionBar(centerX - 180, drawY + 160, 64, 14, 1.0, theme, 6, 22);

    // Right Arm bar (viewer's right, above arm)
    this._drawConditionBar(centerX + 116, drawY + 160, 64, 14, 0.95, theme, 22, 6);

    // Left Leg bar (viewer's left, beside leg)
    this._drawConditionBar(centerX - 175, drawY + 395, 64, 14, 1.0, theme, 6, 22);

    // Right Leg bar (viewer's right, beside leg)
    this._drawConditionBar(centerX + 111, drawY + 395, 64, 14, 1.0, theme, 22, 6);
  }

  /**
   * Helper to draw a Fallout: New Vegas CND bracket meter with extended bottom tray └──────┘
   */
  _drawConditionBar(x, y, w, h, pct = 1.0, theme, extLeft = 6, extRight = 6) {
    this.ctx.save();
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 1.8;
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    // Solid bright phosphor green fill bar
    const innerW = w * pct;
    this.ctx.fillStyle = theme.main;
    this.ctx.fillRect(x, y, innerW, h - 3);

    // Extended bottom tray bracket: └────────┘ underneath the bar
    const trayLeft = x - extLeft;
    const trayRight = x + w + extRight;
    const trayBottom = y + h + 2;
    const tickH = 5;

    this.ctx.beginPath();
    this.ctx.moveTo(trayLeft, trayBottom - tickH);
    this.ctx.lineTo(trayLeft, trayBottom);
    this.ctx.lineTo(trayRight, trayBottom);
    this.ctx.lineTo(trayRight, trayBottom - tickH);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * STATS -> S.P.E.C.I.A.L Attributes View
   */
  _drawSpecialView(width, height, theme) {
    const { top, left, right } = this.padding;
    const padX = left + 44;
    const padRight = right + 44;
    const contentY = top + 85;
    const listW = 400;

    this.ctx.save();
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    // Left List
    this.special.forEach((sp, i) => {
      const y = contentY + 32 + i * 56;
      const isSel = this.selectedSpecialIndex === i;

      if (isSel) {
        this.ctx.strokeStyle = theme.main;
        this.ctx.strokeRect(padX, y - 28, listW, 44);
        this.ctx.fillStyle = theme.dim;
        this.ctx.fillRect(padX, y - 28, listW, 44);
      }

      this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(sp.k, padX + 20, y + 2);

      // Meter bar [======  ]
      const barX = padX + 205;
      this.ctx.strokeRect(barX, y - 15, 130, 18);
      this.ctx.fillRect(barX + 3, y - 12, (sp.val / 10) * 124, 12);
      this.ctx.fillText(sp.val.toString(), barX + 150, y + 2);

      this.hitboxes.push({
        x: padX, y: y - 28, w: listW, h: 44,
        action: () => {
          const dir = i >= this.selectedSpecialIndex ? 1 : -1;
          this.selectedSpecialIndex = i;
          pipboyAudio.playClick();
          this._emitInteraction('item', { direction: dir });
        }
      });
    });

    // Right Detail Card
    const rightX = padX + listW + 40;
    const rightW = width - padRight - rightX;
    const sel = this.special[this.selectedSpecialIndex];

    this.ctx.font = 'bold 26px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillText(sel.k, rightX + 16, contentY + 36);
    this.ctx.beginPath();
    this.ctx.moveTo(rightX + 16, contentY + 54);
    this.ctx.lineTo(rightX + rightW - 16, contentY + 54);
    this.ctx.stroke();

    this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillText(`BASE RANK: ${sel.val} / 10`, rightX + 16, contentY + 100);

    this.ctx.font = '20px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = 'rgba(26, 255, 36, 0.85)';
    this._drawWrappedText(sel.desc, rightX + 16, contentY + 150, rightW - 32, 30);

    this.ctx.restore();
  }

  /**
   * STATS -> Skills View
   */
  _drawSkillsView(width, height, theme) {
    const { top, left } = this.padding;
    const padX = left + 48;
    const contentY = top + 85;

    this.ctx.save();
    this.ctx.font = 'bold 20px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = theme.main;
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    this.skills.forEach((sk, i) => {
      const col = i < 7 ? 0 : 1;
      const row = i < 7 ? i : i - 7;
      const x = padX + col * 440;
      const y = contentY + 32 + row * 56;

      this.ctx.fillText(sk.name, x, y);
      this.ctx.strokeRect(x + 215, y - 16, 120, 18);
      this.ctx.fillRect(x + 218, y - 13, (sk.val / 100) * 114, 12);
      this.ctx.fillText(sk.val.toString(), x + 350, y);
    });

    this.ctx.restore();
  }

  /**
   * STATS -> Perks View
   */
  _drawPerksView(width, height, theme) {
    const { top, left } = this.padding;
    const padX = left + 48;
    const contentY = top + 85;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    this.perks.forEach((pk, i) => {
      const y = contentY + 34 + i * 82;
      this.ctx.font = 'bold 23px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(`★ ${pk.name}`, padX, y);

      this.ctx.font = '19px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.8)';
      this.ctx.fillText(pk.desc, padX + 32, y + 30);
    });

    this.ctx.restore();
  }

  /**
   * STATS -> General View (Engineering Metrics & Highlights)
   */
  _drawGeneralView(width, height, theme) {
    const { top, left } = this.padding;
    const padX = left + 48;
    const contentY = top + 85;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    const currentAge = this._calculateAge();
    const generalStats = [
      ['Total Mobile Experience', '5+ Years (2021 - Present)'],
      ['Chronological Age', `${currentAge} Years Old (DOB: 08/02/2001)`],
      ['Current Location', 'Barcelona, Spain'],
      ['Master\'s Degree', 'PJATK (Mobile Engineering, 2024)'],
      ['Bachelor\'s Degree', 'University of Lodz (CS, 2021)'],
      ['Production Apps Shipped', '3+ (Flutter, Android, iOS)'],
      ['SDK Distribution Ecosystems', 'pub.dev, SPM, Maven, UPM'],
      ['LLM Benchmarking', 'TTFT, Tokens/s, On-Device Tool Calling']
    ];

    generalStats.forEach((st, i) => {
      const y = contentY + 34 + i * 50;
      this.ctx.font = 'bold 21px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(st[0], padX + 16, y);
      this.ctx.font = '20px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillText(st[1], padX + 410, y);
    });

    this.ctx.restore();
  }

  /**
   * PROJECTS View - Clean Empty Page Reserved for Projects (Added Later)
   */
  _drawProjectsView(width, height, theme) {
    const { top, left, right, bottom } = this.padding;
    const contentY = top + 35;
    const footerY = height - bottom - 25;
    const contentH = footerY - contentY - 10;
    const contentW = width - left - right;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    if (!this.projects || this.projects.length === 0) {
      // Empty projects view with authentic Pip-Boy dashed border & clean empty-state UI
      const boxX = left + 20;
      const boxY = contentY + 20;
      const boxW = contentW - 40;
      const boxH = contentH - 40;

      this.ctx.strokeStyle = theme.main;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([8, 6]);
      this.ctx.strokeRect(boxX, boxY, boxW, boxH);
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = theme.dim;
      this.ctx.fillRect(boxX, boxY, boxW, boxH);

      const centerX = width / 2;
      const centerY = boxY + boxH / 2;

      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 28px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText('[ NO ACTIVE PROJECTS LOGGED ]', centerX, centerY - 38);

      this.ctx.font = '20px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.85)';
      this.ctx.fillText('Project records are currently pending classification.', centerX, centerY + 8);
      this.ctx.fillText('Check back soon or explore Experience & Skills in DATA & STATS.', centerX, centerY + 40);

      // Interactive shortcut button to switch to Experience (DATA -> Quests)
      const btnW = 340;
      const btnH = 40;
      const btnX = centerX - btnW / 2;
      const btnY = centerY + 85;

      this.ctx.strokeStyle = theme.main;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(btnX, btnY, btnW, btnH);
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.12)';
      this.ctx.fillRect(btnX, btnY, btnW, btnH);

      this.ctx.font = 'bold 18px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText('▶ VIEW EXPERIENCE LOG [DATA]', centerX, btnY + 26);

      this.hitboxes.push({
        x: btnX, y: btnY, w: btnW, h: btnH,
        action: () => {
          this.switchTab('DATA', 'Quests');
        }
      });

      this.ctx.textAlign = 'left';
    }

    this.ctx.restore();
  }

  /**
   * DATA -> Quests View (Professional Experience)
   */
  _drawQuestsView(width, height, theme) {
    const { top, left, right, bottom } = this.padding;
    const contentY = top + 35;
    const footerY = height - bottom - 25;
    const listW = 440;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    // Experience Company List
    this.quests.forEach((q, i) => {
      const y = contentY + 25 + i * 54;
      const isSel = this.selectedQuestIndex === i;

      if (isSel) {
        this.ctx.strokeStyle = theme.main;
        this.ctx.strokeRect(left + 10, y - 22, listW - 20, 44);
        this.ctx.fillStyle = theme.dim;
        this.ctx.fillRect(left + 10, y - 22, listW - 20, 44);
      }

      this.ctx.font = 'bold 18px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(`[${q.status === 'RECENT' ? '★' : '✓'}] ${q.title}`, left + 25, y + 2);

      this.ctx.font = '14px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.7)';
      this.ctx.fillText(`${q.role} | ${q.period}`, left + 25, y + 20);

      this.hitboxes.push({
        x: left + 10, y: y - 22, w: listW - 20, h: 44,
        action: () => {
          const dir = i >= this.selectedQuestIndex ? 1 : -1;
          this.selectedQuestIndex = i;
          pipboyAudio.playClick();
          this._emitInteraction('item', { direction: dir });
        }
      });
    });

    // Experience Role & Responsibilities Detail
    const rightX = left + listW + 20;
    const rightW = width - right - rightX;
    const q = this.quests[this.selectedQuestIndex] || this.quests[0];

    if (q) {
      this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(q.title, rightX + 10, contentY + 30);

      this.ctx.font = '16px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.85)';
      this.ctx.fillText(`${q.role}  (${q.period})`, rightX + 10, contentY + 52);

      this.ctx.beginPath();
      this.ctx.moveTo(rightX + 10, contentY + 62);
      this.ctx.lineTo(rightX + rightW - 10, contentY + 62);
      this.ctx.stroke();

      this.ctx.font = 'bold 16px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText('KEY ACHIEVEMENTS & CONTRIBUTIONS:', rightX + 10, contentY + 95);

      q.obj.forEach((o, idx) => {
        const oy = contentY + 125 + idx * 46;
        this.ctx.font = 'bold 16px "monofonto", "Share Tech Mono", monospace';
        this.ctx.fillStyle = theme.main;
        this.ctx.fillText('>', rightX + 10, oy);
        this.ctx.font = '15px "monofonto", "Share Tech Mono", monospace';
        this.ctx.fillStyle = 'rgba(26, 255, 36, 0.9)';
        this._drawWrappedText(o, rightX + 28, oy, rightW - 36, 18);
      });
    }

    this.ctx.restore();
  }

  /**
   * DATA -> World Map View (Mojave Wasteland)
   */
  _drawMapView(width, height, theme) {
    const { top, left, right, bottom } = this.padding;
    const contentY = top + 35;
    const footerY = height - bottom - 25;
    const mapW = width - left - right;
    const mapH = footerY - contentY - 10;

    this.ctx.save();
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 1;
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    // Grid lines
    this.ctx.strokeStyle = theme.dim;
    for (let x = left; x < left + mapW; x += 55) {
      this.ctx.beginPath(); this.ctx.moveTo(x, contentY); this.ctx.lineTo(x, contentY + mapH); this.ctx.stroke();
    }
    for (let y = contentY; y < contentY + mapH; y += 55) {
      this.ctx.beginPath(); this.ctx.moveTo(left, y); this.ctx.lineTo(left + mapW, y); this.ctx.stroke();
    }

    // Scanning sweep line
    this.scanY = (this.scanY + 2) % mapH;
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(left, contentY + this.scanY);
    this.ctx.lineTo(left + mapW, contentY + this.scanY);
    this.ctx.stroke();

    // Career & Education Locations
    const locs = this.mapLocations || [
      { name: 'BARCELONA, SPAIN', x: 250, y: 270, role: 'Current Base | Multiverse Computing' },
      { name: 'WARSAW, POLAND', x: 600, y: 145, role: 'Polish-Japanese Academy | M.Sc.' },
      { name: 'LODZ, POLAND', x: 520, y: 205, role: 'University of Lodz | B.Sc.' },
      { name: 'NORTH AMERICA', x: 160, y: 155, role: 'Upwork Freelance | 3 Flutter Apps' }
    ];

    locs.forEach((loc, idx) => {
      const lx = left + loc.x;
      const ly = contentY + loc.y;
      const isSel = this.selectedMapLocIndex === idx;

      this.ctx.fillStyle = theme.main;
      this.ctx.beginPath();
      this.ctx.arc(lx, ly, isSel ? 9 : 7, 0, Math.PI * 2);
      this.ctx.fill();

      if (isSel) {
        this.ctx.strokeStyle = theme.main;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(lx, ly, 15, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.font = 'bold 15px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillText(loc.name, lx + 14, ly + 5);

      this.hitboxes.push({
        x: lx - 12, y: ly - 12, w: 200, h: 26,
        action: () => {
          const dir = idx >= this.selectedMapLocIndex ? 1 : -1;
          this.selectedMapLocIndex = idx;
          pipboyAudio.playClick();
          this._emitInteraction('item', { direction: dir });
        }
      });
    });

    // Active location description box at top right
    const activeLoc = locs[this.selectedMapLocIndex || 0];
    if (activeLoc) {
      const cardX = left + mapW - 420;
      const cardY = contentY + 15;
      this.ctx.strokeStyle = theme.main;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(cardX, cardY, 400, 52);
      this.ctx.fillStyle = theme.dim;
      this.ctx.fillRect(cardX, cardY, 400, 52);

      this.ctx.font = 'bold 16px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(`LOCATION: ${activeLoc.name}`, cardX + 12, cardY + 22);
      this.ctx.font = '14px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.85)';
      this.ctx.fillText(activeLoc.role, cardX + 12, cardY + 42);
    }

    // Player marker pulse at Barcelona (Home Base)
    const bcnX = left + 250;
    const bcnY = contentY + 270;
    this.ctx.beginPath();
    this.ctx.arc(bcnX, bcnY, 14 + Math.sin(Date.now() * 0.006) * 5, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.font = 'bold 14px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = theme.main;
    this.ctx.fillText('▲ CURRENT BASE', bcnX + 18, bcnY - 10);
    this.ctx.restore();
  }

  /**
   * DATA -> Radio View (Radio New Vegas & Oscilloscope)
   */
  _drawRadioView(width, height, theme) {
    const { top, left, right, bottom } = this.padding;
    const contentY = top + 35;
    const footerY = height - bottom - 25;
    const contentH = footerY - contentY - 10;
    const listW = 440;

    this.ctx.save();
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    // Station list
    this.radioStations.forEach((st, i) => {
      const y = contentY + 30 + i * 65;
      const isSel = this.selectedRadioIndex === i;

      if (isSel) {
        this.ctx.strokeStyle = theme.main;
        this.ctx.strokeRect(left + 10, y - 22, listW - 20, 52);
        this.ctx.fillStyle = theme.dim;
        this.ctx.fillRect(left + 10, y - 22, listW - 20, 52);
      }

      this.ctx.font = 'bold 19px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText(st.name, left + 25, y + 2);
      this.ctx.font = '15px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillText(st.freq, left + 340, y + 2);

      this.ctx.fillStyle = 'rgba(26, 255, 36, 0.7)';
      this.ctx.fillText(st.dj, left + 25, y + 22);

      this.hitboxes.push({
        x: left + 10, y: y - 22, w: listW - 20, h: 52,
        action: () => {
          const isSame = this.selectedRadioIndex === i;
          const dir = i >= this.selectedRadioIndex ? 1 : -1;
          this.selectedRadioIndex = i;
          pipboyAudio.playClick();
          pipboyAudio.toggleRadioStatic(true);
          this._emitInteraction('item', { direction: dir });
          if (isSame && st.url && typeof window !== 'undefined') {
            window.open(st.url, '_blank', 'noopener,noreferrer');
          }
        }
      });
    });

    // Oscilloscope Card
    const rightX = left + listW + 20;
    const rightW = width - right - rightX;
    const st = this.radioStations[this.selectedRadioIndex];

    this.ctx.font = 'bold 22px "monofonto", "Share Tech Mono", monospace';
    this.ctx.fillStyle = theme.main;
    this.ctx.fillText(`TUNED: ${st.name}`, rightX + 10, contentY + 30);

    // Optional direct link button for active channel
    if (st && st.url) {
      const btnW = 160;
      const btnH = 26;
      const btnX = rightX + 10;
      const btnY = contentY + 44;
      this.ctx.strokeStyle = theme.main;
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(btnX, btnY, btnW, btnH);
      this.ctx.fillStyle = theme.dim;
      this.ctx.fillRect(btnX, btnY, btnW, btnH);
      this.ctx.font = 'bold 14px "monofonto", "Share Tech Mono", monospace';
      this.ctx.fillStyle = theme.main;
      this.ctx.fillText('▶ OPEN CHANNEL', btnX + 14, btnY + 18);

      this.hitboxes.push({
        x: btnX, y: btnY, w: btnW, h: btnH,
        action: () => {
          pipboyAudio.playClick();
          if (typeof window !== 'undefined') {
            window.open(st.url, '_blank', 'noopener,noreferrer');
          }
        }
      });
    }

    // Live Oscilloscope Waveform Animation
    this.wavePhase += 0.08;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    const centerY = contentY + 150;

    for (let x = rightX + 10; x < rightX + rightW - 10; x += 4) {
      const amp = 40;
      const y = centerY + Math.sin((x * 0.03) + this.wavePhase) * amp + (Math.random() - 0.5) * 6;
      if (x === rightX + 10) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    // Equalizer bars
    for (let b = 0; b < 18; b++) {
      const bx = rightX + 20 + b * 22;
      const bh = 15 + Math.abs(Math.sin(b * 0.5 + this.wavePhase * 2)) * 75;
      this.ctx.fillRect(bx, contentY + 340 - bh, 15, bh);
    }

    this.ctx.restore();
  }

  /**
   * Bottom Sub-navigation Bar - Exact Fallout: New Vegas format:
   * └── [ Status ] ───── S.P.E.C.I.A.L. ───── Skills ───── Perks ───── General ───┘
   */
  _drawBottomSubtabs(width, height, theme) {
    const { left, right, bottom } = this.padding;
    const y = height - bottom - 12;
    const lineY = y - 8;

    let subtabs = [];
    if (this.currentTab === 'STATS') {
      subtabs = ['Status', 'S.P.E.C.I.A.L.', 'Skills', 'Perks', 'General'];
    } else if (this.currentTab === 'PROJECTS' || this.currentTab === 'ITEMS') {
      subtabs = ['All Projects', 'Mobile', 'SDKs', 'AI', 'Open Source'];
    } else {
      subtabs = ['Experience', 'Map', 'Radio', 'Contact'];
    }

    this.ctx.save();
    this.ctx.font = 'bold 26px "monofonto", "Share Tech Mono", monospace';
    this.ctx.shadowColor = theme.glow;
    this.ctx.shadowBlur = 2.5;

    const cornerLead = 44;
    const startX = left + cornerLead;
    const endX = width - right - cornerLead;
    const availableW = endX - startX;

    // Pre-measure all subtabs so spaces between them are completely even across the full width
    const items = subtabs.map((sub) => {
      const isSel = this.currentSubTab.toLowerCase() === sub.toLowerCase();
      const textW = this.ctx.measureText(sub).width;
      const boxPadX = 24;
      const itemW = isSel ? textW + boxPadX : textW;
      return { sub, isSel, textW, itemW };
    });

    const totalItemsW = items.reduce((sum, it) => sum + it.itemW, 0);
    const evenGap = items.length > 1 ? (availableW - totalItemsW) / (items.length - 1) : 0;

    // Bottom-left vertical rule with fade-out at top end
    this._drawCornerVerticalFade(left, lineY, lineY - 55, theme);

    // Bottom-left horizontal rule connecting corner to first subtab
    const firstItem = items[0];
    const leftLineEnd = firstItem.isSel ? startX : startX - 10;
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(left, lineY);
    this.ctx.lineTo(leftLineEnd, lineY);
    this.ctx.stroke();

    let currX = startX;

    items.forEach((it, i) => {
      if (it.isSel) {
        // Active Subtab: enclosed in green rectangular button box [ Status ]
        const boxH = 36;
        const boxY = lineY - boxH / 2;
        this.ctx.strokeStyle = theme.main;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(currX, boxY, it.itemW, boxH);
        this.ctx.fillStyle = theme.dim;
        this.ctx.fillRect(currX, boxY, it.itemW, boxH);

        this.ctx.fillStyle = theme.main;
        this.ctx.fillText(it.sub, currX + 12, y);

        this.hitboxes.push({
          x: currX, y: boxY, w: it.itemW, h: boxH,
          action: () => { this.switchSubTab(it.sub); }
        });
      } else {
        // Inactive Subtab
        this.ctx.fillStyle = 'rgba(26, 255, 36, 0.8)';
        this.ctx.fillText(it.sub, currX, y);

        this.hitboxes.push({
          x: currX - 6, y: lineY - 18, w: it.itemW + 12, h: 36,
          action: () => { this.switchSubTab(it.sub); }
        });
      }

      // Evenly spaced horizontal connecting line between subtabs with generous padding around labels
      if (i < items.length - 1) {
        const nextItem = items[i + 1];
        const nextX = currX + it.itemW + evenGap;
        const textPad = 22;
        const segStart = it.isSel ? currX + it.itemW + 6 : currX + it.itemW + textPad;
        const segEnd = nextItem.isSel ? nextX - 6 : nextX - textPad;

        if (segEnd > segStart) {
          this.ctx.strokeStyle = theme.main;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(segStart, lineY);
          this.ctx.lineTo(segEnd, lineY);
          this.ctx.stroke();
        }

        currX = nextX;
      } else {
        currX += it.itemW;
      }
    });

    // Bottom-right horizontal line continuing from last subtab to the right margin
    const lastItem = items[items.length - 1];
    const rightLineStart = lastItem.isSel ? currX : currX + 18;
    this.ctx.strokeStyle = theme.main;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(rightLineStart, lineY);
    this.ctx.lineTo(width - right, lineY);
    this.ctx.stroke();

    // Bottom-right vertical rule with fade-out at top end
    this._drawCornerVerticalFade(width - right, lineY, lineY - 55, theme);

    this.ctx.restore();
  }

  /**
   * Triggers one of 4 authentic Fallout top-to-bottom CRT screen animations
   */
  _triggerRandomScreenAnimation(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    const types = [
      { name: 'phosphor_roll_wave', duration: 1150 },
      { name: 'sync_tear_sweep', duration: 920 },
      { name: 'double_harmonic_sweep', duration: 1300 },
      { name: 'vhold_cascade_glitch', duration: 1050 }
    ];

    let idx = Math.floor(Math.random() * types.length);
    if (idx === this.lastAnimType && types.length > 1) {
      idx = (idx + 1) % types.length;
    }
    this.lastAnimType = idx;

    this.activeScreenAnim = {
      type: types[idx].name,
      startTime: now,
      duration: types[idx].duration
    };

    // Schedule next random animation in ~10 seconds (9.0s - 11.0s)
    this.nextAnimTimestamp = now + 9000 + Math.random() * 2000;
  }

  /**
   * Renders continuous subtle CRT refresh roll + periodic (~every 10s) top-to-bottom screen animations
   */
  _drawScreenAnimations(width, height, theme) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Continuous subtle CRT refresh bar slowly drifting top-to-bottom
    this.ambientRollY = (this.ambientRollY + 1.8) % (height + 160);
    const ambY = this.ambientRollY - 80;
    const ambGrad = this.ctx.createLinearGradient(0, ambY - 45, 0, ambY + 45);
    ambGrad.addColorStop(0, 'rgba(24, 220, 34, 0)');
    ambGrad.addColorStop(0.5, 'rgba(24, 220, 34, 0.028)');
    ambGrad.addColorStop(1, 'rgba(24, 220, 34, 0)');
    this.ctx.fillStyle = ambGrad;
    this.ctx.fillRect(0, ambY - 45, width, 90);

    // 2. Check if it's time to trigger the ~10-second random top-to-bottom animation
    if (!this.activeScreenAnim && now >= this.nextAnimTimestamp) {
      this._triggerRandomScreenAnimation(now);
    }

    if (!this.activeScreenAnim) return;

    const elapsed = now - this.activeScreenAnim.startTime;
    const progress = elapsed / this.activeScreenAnim.duration;

    if (progress >= 1) {
      this.activeScreenAnim = null;
      return;
    }

    this.ctx.save();
    const type = this.activeScreenAnim.type;

    if (type === 'phosphor_roll_wave') {
      // Type 1: Classic Top-to-Bottom Phosphor Hum Bar + Horizontal Sine Wave Warp
      const bandH = 110;
      const sweepY = -bandH + progress * (height + bandH * 2);

      // Horizontal wave displacement of UI strips inside the descending band
      const numSlices = 20;
      const sliceH = Math.ceil(bandH / numSlices);
      for (let i = 0; i < numSlices; i++) {
        const sy = Math.round(sweepY - bandH / 2 + i * sliceH);
        if (sy >= 0 && sy + sliceH <= height) {
          const norm = (i / numSlices) * Math.PI;
          const offsetX = Math.sin(norm * 2 + progress * 12) * Math.sin(norm) * 5.5;
          this.ctx.drawImage(this.canvas, 0, sy, width, sliceH, offsetX, sy, width, sliceH);
        }
      }

      // Soft top-to-bottom phosphor sweep glow band
      const rollGrad = this.ctx.createLinearGradient(0, sweepY - bandH / 2, 0, sweepY + bandH / 2);
      rollGrad.addColorStop(0, 'rgba(24, 220, 34, 0)');
      rollGrad.addColorStop(0.5, 'rgba(24, 220, 34, 0.10)');
      rollGrad.addColorStop(0.85, 'rgba(24, 220, 34, 0.16)');
      rollGrad.addColorStop(1, 'rgba(24, 220, 34, 0)');
      this.ctx.fillStyle = rollGrad;
      this.ctx.fillRect(0, sweepY - bandH / 2, width, bandH);
    } else if (type === 'sync_tear_sweep') {
      // Type 2: Top-to-Bottom Electromagnetic Sync Tear & Crisp Scan Beam
      const beamY = progress * (height + 80) - 40;

      // Horizontal sync tearing strips around the descending beam
      for (let s = -3; s <= 3; s++) {
        const sy = Math.round(beamY + s * 7);
        const sh = 6;
        if (sy >= 0 && sy + sh <= height) {
          const tearX = (Math.sin(sy * 0.4 + now * 0.05) * 8) * (1 - Math.abs(s) / 4);
          this.ctx.drawImage(this.canvas, 0, sy, width, sh, tearX, sy, width, sh);
        }
      }

      // Trailing phosphor afterglow above the descending beam
      const trailH = 75;
      const trailGrad = this.ctx.createLinearGradient(0, beamY - trailH, 0, beamY + 4);
      trailGrad.addColorStop(0, 'rgba(24, 220, 34, 0)');
      trailGrad.addColorStop(0.88, 'rgba(24, 220, 34, 0.11)');
      trailGrad.addColorStop(1, 'rgba(120, 255, 130, 0.25)');
      this.ctx.fillStyle = trailGrad;
      this.ctx.fillRect(0, beamY - trailH, width, trailH + 4);

      // Leading bright scanline
      this.ctx.fillStyle = 'rgba(140, 255, 145, 0.32)';
      this.ctx.fillRect(0, beamY, width, 2);
    } else if (type === 'double_harmonic_sweep') {
      // Type 3: Twin Coupled Top-to-Bottom Scan Bands
      const primaryY = -80 + progress * (height + 220);
      const secondaryY = primaryY - 95;

      [primaryY, secondaryY].forEach((by, idx) => {
        const bh = idx === 0 ? 70 : 45;
        for (let i = 0; i < 10; i++) {
          const sy = Math.round(by - bh / 2 + i * (bh / 10));
          if (sy >= 0 && sy + 5 <= height) {
            const shift = Math.sin((i / 10) * Math.PI) * (idx === 0 ? 4 : -3);
            this.ctx.drawImage(this.canvas, 0, sy, width, 5, shift, sy, width, 5);
          }
        }

        const g = this.ctx.createLinearGradient(0, by - bh / 2, 0, by + bh / 2);
        g.addColorStop(0, 'rgba(24, 220, 34, 0)');
        g.addColorStop(0.5, idx === 0 ? 'rgba(24, 220, 34, 0.11)' : 'rgba(24, 220, 34, 0.08)');
        g.addColorStop(1, 'rgba(24, 220, 34, 0)');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, by - bh / 2, width, bh);
      });
    } else if (type === 'vhold_cascade_glitch') {
      // Type 4: Top-to-Bottom CRT Vertical-Hold Refresh Curtain & Micro Static Streaks
      const curtainY = progress * (height + 100) - 50;
      const bandH = 90;

      for (let i = 0; i < 14; i++) {
        const sy = Math.round(curtainY - bandH / 2 + i * 6);
        if (sy >= 0 && sy + 6 <= height) {
          const dx = Math.cos(i * 0.9 + progress * 18) * 4.5;
          this.ctx.drawImage(this.canvas, 0, sy, width, 6, dx, sy, width, 6);
        }
      }

      // Refresh curtain gradient
      const cGrad = this.ctx.createLinearGradient(0, curtainY - bandH / 2, 0, curtainY + bandH / 2);
      cGrad.addColorStop(0, 'rgba(24, 220, 34, 0)');
      cGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.18)');
      cGrad.addColorStop(0.75, 'rgba(24, 220, 34, 0.14)');
      cGrad.addColorStop(1, 'rgba(24, 220, 34, 0)');
      this.ctx.fillStyle = cGrad;
      this.ctx.fillRect(0, curtainY - bandH / 2, width, bandH);

      // Subtle horizontal static streaks inside the descending curtain
      this.ctx.fillStyle = 'rgba(120, 255, 130, 0.22)';
      for (let k = 0; k < 5; k++) {
        const rx = ((Math.sin(now * 0.01 + k * 3.7) + 1) * 0.4) * width;
        const rw = 60 + ((k * 47) % 140);
        const ry = curtainY - 25 + k * 11;
        if (ry >= 0 && ry <= height) {
          this.ctx.fillRect(rx, ry, rw, 1.5);
        }
      }
    }

    this.ctx.restore();
  }

  _drawScanlines(width, height, theme) {
    this.ctx.fillStyle = theme.scanline || 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < height; y += 4) {
      this.ctx.fillRect(0, y, width, 2);
    }
  }

  _drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        this.ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }

  /**
   * Captures the current screen frame into prevFrameCanvas and starts a CRT phosphor crossfade
   */
  _startTabCrossfade(isMajor = false) {
    if (this.prevFrameCtx && this.canvas) {
      this.prevFrameCtx.clearRect(0, 0, this.prevFrameCanvas.width, this.prevFrameCanvas.height);
      this.prevFrameCtx.drawImage(this.canvas, 0, 0);
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.tabCrossfade = {
      startTime: now,
      duration: isMajor ? 340 : 260,
      isMajor
    };
  }

  /**
   * Blends the outgoing screen snapshot over the incoming screen with CRT phosphor decay & sync shimmer
   */
  _drawTabCrossfade(width, height, theme) {
    if (!this.tabCrossfade || !this.prevFrameCanvas) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - this.tabCrossfade.startTime;
    const progress = elapsed / this.tabCrossfade.duration;

    if (progress >= 1) {
      this.tabCrossfade = null;
      return;
    }

    // Phosphor persistence decay curve (lingers briefly then fades smoothly to 0)
    const ghostAlpha = Math.pow(1 - progress, 1.55) * 0.85;

    this.ctx.save();
    // 'screen' blend keeps the dark CRT background transparent so old & new green phosphor elements crossfade cleanly
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = ghostAlpha;

    // Slight horizontal CRT deflection jitter during the first half of the tab switch
    const jitterX = progress < 0.5 ? Math.sin(progress * Math.PI * 6) * (1 - progress * 2) * (this.tabCrossfade.isMajor ? 5 : 3) : 0;
    this.ctx.drawImage(this.prevFrameCanvas, jitterX, 0, width, height);

    // Fast top-to-bottom phosphor refresh sweep accompanying the crossfade
    const sweepY = progress * height;
    const sweepH = 95;
    const sweepGrad = this.ctx.createLinearGradient(0, sweepY - sweepH / 2, 0, sweepY + sweepH / 2);
    sweepGrad.addColorStop(0, 'rgba(24, 220, 34, 0)');
    sweepGrad.addColorStop(0.5, `rgba(24, 220, 34, ${(1 - progress) * 0.14})`);
    sweepGrad.addColorStop(1, 'rgba(24, 220, 34, 0)');
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = sweepGrad;
    this.ctx.fillRect(0, sweepY - sweepH / 2, width, sweepH);

    this.ctx.restore();
  }

  getSubTabsForCurrentTab() {
    if (this.currentTab === 'STATS') {
      return ['Status', 'S.P.E.C.I.A.L.', 'Skills', 'Perks', 'General'];
    } else if (this.currentTab === 'PROJECTS' || this.currentTab === 'ITEMS') {
      return ['All Projects', 'Mobile', 'SDKs', 'AI', 'Open Source'];
    }
    return ['Experience', 'Map', 'Radio', 'Contact'];
  }

  getCurrentSubTabIndex() {
    const subs = this.getSubTabsForCurrentTab();
    const idx = subs.findIndex((s) => s.toLowerCase() === (this.currentSubTab || '').toLowerCase());
    return idx >= 0 ? idx : 0;
  }

  cycleSubTab(step = 1) {
    const subs = this.getSubTabsForCurrentTab();
    if (!subs.length) return;
    const currIdx = this.getCurrentSubTabIndex();
    const nextIdx = (currIdx + step + subs.length) % subs.length;
    this.switchSubTab(subs[nextIdx]);
  }

  stepSelection(delta = 1) {
    const dir = delta >= 0 ? 1 : -1;
    const sub = (this.currentSubTab || '').toLowerCase();

    if (this.currentTab === 'STATS') {
      if (sub === 'status' && this.hardcoreStats?.length) {
        this.selectedHardcoreIndex =
          (this.selectedHardcoreIndex + dir + this.hardcoreStats.length) % this.hardcoreStats.length;
        pipboyAudio.playClick();
        this._emitInteraction('item', { direction: dir });
        return;
      } else if (sub === 's.p.e.c.i.a.l.' && this.special?.length) {
        this.selectedSpecialIndex =
          (this.selectedSpecialIndex + dir + this.special.length) % this.special.length;
        pipboyAudio.playClick();
        this._emitInteraction('item', { direction: dir });
        return;
      }
    } else if (this.currentTab === 'DATA') {
      if (sub === 'experience' && this.quests?.length) {
        this.selectedQuestIndex =
          (this.selectedQuestIndex + dir + this.quests.length) % this.quests.length;
        pipboyAudio.playClick();
        this._emitInteraction('item', { direction: dir });
        return;
      } else if (sub.includes('map') && this.mapLocations?.length) {
        this.selectedMapLocIndex =
          (this.selectedMapLocIndex + dir + this.mapLocations.length) % this.mapLocations.length;
        pipboyAudio.playClick();
        this._emitInteraction('item', { direction: dir });
        return;
      } else if ((sub === 'radio' || sub === 'contact') && this.radioStations?.length) {
        this.selectedRadioIndex =
          (this.selectedRadioIndex + dir + this.radioStations.length) % this.radioStations.length;
        pipboyAudio.playClick();
        pipboyAudio.toggleRadioStatic(true);
        this._emitInteraction('item', { direction: dir });
        return;
      }
    }

    // Fallback: if current view has no selectable list, step through subtabs
    this.cycleSubTab(dir);
  }

  _emitInteraction(type, payload = {}) {
    if (typeof this.onInteraction === 'function') {
      this.onInteraction({
        type,
        tab: this.currentTab,
        subTab: this.currentSubTab,
        subTabIndex: this.getCurrentSubTabIndex(),
        ...payload
      });
    }
  }

  switchTab(tab, subTab = null) {
    this._startTabCrossfade(true);
    const upper = tab.toUpperCase();
    if (upper === 'STAT' || upper === 'STATS') {
      this.currentTab = 'STATS';
      if (subTab) {
        this.currentSubTab = subTab;
      } else if (!['Status', 'S.P.E.C.I.A.L.', 'Skills', 'Perks', 'General'].includes(this.currentSubTab)) {
        this.currentSubTab = 'Status';
      }
    } else if (upper === 'PROJECTS' || upper === 'INV' || upper === 'ITEMS') {
      this.currentTab = 'PROJECTS';
      if (subTab) {
        this.currentSubTab = subTab;
      } else if (!['All Projects', 'Mobile', 'SDKs', 'AI', 'Open Source'].includes(this.currentSubTab)) {
        this.currentSubTab = 'All Projects';
      }
    } else if (upper === 'DATA' || upper === 'MAP' || upper === 'RADIO') {
      this.currentTab = 'DATA';
      if (subTab) {
        if (subTab.toLowerCase() === 'quests' || subTab.toLowerCase() === 'experience') this.currentSubTab = 'Experience';
        else if (subTab.toLowerCase().includes('map')) this.currentSubTab = 'Map';
        else this.currentSubTab = subTab;
      } else if (upper === 'MAP') {
        this.currentSubTab = 'Map';
      } else if (upper === 'RADIO') {
        this.currentSubTab = 'Radio';
      } else if (!['Experience', 'Map', 'Radio', 'Contact'].includes(this.currentSubTab)) {
        this.currentSubTab = 'Experience';
      }
    }
    pipboyAudio.playCategoryChange();
    this._emitInteraction('tab', { direction: 1 });
  }

  switchSubTab(sub) {
    if (this.currentSubTab.toLowerCase() === sub.toLowerCase()) {
      pipboyAudio.playClick();
      this._emitInteraction('item', { direction: 1 });
      return;
    }
    const prevIdx = this.getCurrentSubTabIndex();
    this._startTabCrossfade(false);
    this.currentSubTab = sub;
    const nextIdx = this.getCurrentSubTabIndex();
    pipboyAudio.playSubCategoryChange();
    if (sub.toLowerCase() === 'radio') {
      pipboyAudio.toggleRadioStatic(true);
    }
    this._emitInteraction('subtab', { direction: nextIdx >= prevIdx ? 1 : -1 });
  }

  /**
   * Handle 2D Canvas click translated from 3D Raycaster UV intersection
   */
  handleClick(canvasX, canvasY) {
    for (const box of this.hitboxes) {
      if (
        canvasX >= box.x &&
        canvasX <= box.x + box.w &&
        canvasY >= box.y &&
        canvasY <= box.y + box.h
      ) {
        box.action();
        return true;
      }
    }
    return false;
  }
}

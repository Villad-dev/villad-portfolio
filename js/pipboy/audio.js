/**
 * Pip-Boy 3000 Audio Manager (Fallout: New Vegas / Fallout 3 authentic sounds)
 * Plays real sound assets from assets/sounds/ with Web Audio API caching,
 * low-latency polyphony, and synthesizer fallbacks.
 */

const SOUND_ASSETS = {
  accessUp: './assets/sounds/npc-idle-pipboy-access-up.mp3',
  accessDown: './assets/sounds/npc-idle-pipboy-access-down.mp3',
  ui: [
    './assets/sounds/ui-npc-idle-pipboy-ui-01.mp3',
    './assets/sounds/ui-npc-idle-pipboy-ui-02.mp3',
    './assets/sounds/ui-npc-idle-pipboy-ui-03.mp3',
    './assets/sounds/ui-npc-idle-pipboy-ui-04.mp3',
    './assets/sounds/ui-npc-idle-pipboy-ui-05.mp3',
    './assets/sounds/ui-npc-idle-pipboy-ui-06.mp3'
  ],
  static: [
    './assets/sounds/static-npc-idle-pipboy-static-01.mp3',
    './assets/sounds/static-npc-idle-pipboy-static-02.mp3',
    './assets/sounds/static-npc-idle-pipboy-static-03.mp3',
    './assets/sounds/static-npc-idle-pipboy-static-04.mp3',
    './assets/sounds/static-npc-idle-pipboy-static-05.mp3'
  ]
};

class PipBoyAudio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.isMuted = false;
    this.lastUiIndex = -1;
    this.currentStatic = null;

    this._setupUserGestureUnlock();
    this._preloadAll();
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _setupUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this._initContext();
      ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt =>
        window.removeEventListener(evt, unlock)
      );
    };
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt =>
      window.addEventListener(evt, unlock, { passive: true })
    );
  }

  _preloadAll() {
    const allUrls = [
      SOUND_ASSETS.accessUp,
      SOUND_ASSETS.accessDown,
      ...SOUND_ASSETS.ui,
      ...SOUND_ASSETS.static
    ];
    allUrls.forEach(url => this.loadBuffer(url).catch(() => {}));
  }

  async loadBuffer(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    if (this.loadingPromises.has(url)) return this.loadingPromises.get(url);

    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();

        this._initContext();
        if (this.ctx) {
          const audioBuf = await new Promise((resolve, reject) => {
            this.ctx.decodeAudioData(arrayBuf, resolve, reject);
          });
          this.buffers.set(url, audioBuf);
          return audioBuf;
        }
        return null;
      } catch (err) {
        console.warn(`[PipBoyAudio] Note: ${url} preloaded with HTML5 audio fallback:`, err.message);
        return null;
      }
    })();

    this.loadingPromises.set(url, promise);
    return promise;
  }

  playSound(url, { volume = 0.3, playbackRate = 1.0, loop = false } = {}) {
    if (this.isMuted) return null;
    this._initContext();

    const buffer = this.buffers.get(url);
    if (this.ctx && buffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        source.loop = loop;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(0);
        return { source, gainNode };
      } catch (err) {
        console.warn('[PipBoyAudio] Buffer playback error:', err);
      }
    }

    // Fallback: HTML5 Audio element
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.playbackRate = playbackRate;
      audio.loop = loop;
      audio.play().catch(() => {});
      return { source: audio, gainNode: null };
    } catch {
      return null;
    }
  }

  /**
   * Pip-Boy tactile button click / menu item selection
   * Plays a random UI sound from the 6 authentic New Vegas sound clips
   */
  playClick(pitchMultiplier = 1.0) {
    if (this.isMuted) return;

    let idx = Math.floor(Math.random() * SOUND_ASSETS.ui.length);
    if (idx === this.lastUiIndex && SOUND_ASSETS.ui.length > 1) {
      idx = (idx + 1) % SOUND_ASSETS.ui.length;
    }
    this.lastUiIndex = idx;
    const url = SOUND_ASSETS.ui[idx];
    const rate = pitchMultiplier * (0.97 + Math.random() * 0.06);

    const played = this.playSound(url, { volume: 0.32, playbackRate: rate });
    if (!played) {
      this._synthClick();
    }
  }

  /**
   * Play an authentic short static burst from static-01..05.mp3
   * @param {number} volume - static volume level
   * @param {number} duration - static burst duration in seconds
   */
  playStaticBurst(volume = 0.24, duration = 0.32) {
    if (this.isMuted) return null;
    this._initContext();

    const idx = Math.floor(Math.random() * SOUND_ASSETS.static.length);
    const url = SOUND_ASSETS.static[idx];
    const buffer = this.buffers.get(url);

    if (this.ctx && buffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (duration) {
          const fadeStart = this.ctx.currentTime + duration * 0.65;
          const fadeEnd = this.ctx.currentTime + duration;
          gainNode.gain.setValueAtTime(volume, fadeStart);
          gainNode.gain.exponentialRampToValueAtTime(0.001, fadeEnd);
        }

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(0);
        if (duration) {
          source.stop(this.ctx.currentTime + duration + 0.05);
        }
        return { source, gainNode };
      } catch (err) {
        console.warn('[PipBoyAudio] static burst error:', err);
      }
    }

    // Fallback: HTML5 Audio
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
      if (duration) {
        setTimeout(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
        }, duration * 1000);
      }
      return { source: audio, gainNode: null };
    } catch {
      return null;
    }
  }

  /**
   * Category change (STATS, ITEMS, DATA)
   * Plays tactile click + authentic static burst from static-01..05.mp3
   */
  playCategoryChange() {
    if (this.isMuted) return;
    this.playClick(1.08);
    this.playStaticBurst(0.24, 0.35);
  }

  /**
   * Subcategory change (Status, S.P.E.C.I.A.L., Skills, Weapons, Quests, Radio, etc.)
   * Plays tactile click + authentic static burst from static-01..05.mp3
   */
  playSubCategoryChange() {
    if (this.isMuted) return;
    this.playClick(1.02);
    this.playStaticBurst(0.22, 0.3);
  }

  /**
   * Pip-Boy top-level mode / tab switch
   */
  playTabBeep() {
    this.playCategoryChange();
  }

  /**
   * Pip-Boy power-on / access up
   * Plays authentic mechanical access-up sound
   */
  playPowerOn() {
    this.playAccessUp();
  }

  playAccessUp() {
    if (this.isMuted) return;
    const played = this.playSound(SOUND_ASSETS.accessUp, { volume: 0.4, playbackRate: 1.0 });
    if (!played) {
      this._synthPowerOn();
    }
  }

  /**
   * Pip-Boy power-off / access down (putting away / unzooming Pip-Boy)
   */
  playAccessDown() {
    if (this.isMuted) return;
    this.playSound(SOUND_ASSETS.accessDown, { volume: 0.4, playbackRate: 1.0 });
  }

  /**
   * Radio tuning static burst
   */
  toggleRadioStatic(enable = true) {
    if (!enable) {
      if (this.currentStatic) {
        try {
          const { source, gainNode } = this.currentStatic;
          if (this.ctx && gainNode) {
            gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
            setTimeout(() => {
              try { source.stop(); } catch {}
            }, 160);
          } else if (source && source.pause) {
            source.pause();
          }
        } catch {}
        this.currentStatic = null;
      }
      return;
    }

    // Stop any existing static
    if (this.currentStatic) {
      try {
        if (this.currentStatic.source.stop) this.currentStatic.source.stop();
        if (this.currentStatic.source.pause) this.currentStatic.source.pause();
      } catch {}
      this.currentStatic = null;
    }

    const idx = Math.floor(Math.random() * SOUND_ASSETS.static.length);
    const url = SOUND_ASSETS.static[idx];
    this.currentStatic = this.playSound(url, { volume: 0.25, playbackRate: 1.0, loop: false });
  }

  // --- Synthesizer Fallbacks (in case network requests fail) ---
  _synthClick() {
    this._initContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  _synthPowerOn() {
    this._initContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {}
  }
}

export const pipboyAudio = new PipBoyAudio();

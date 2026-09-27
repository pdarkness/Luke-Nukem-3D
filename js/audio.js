'use strict';
// All sound is synthesized with WebAudio - no sample files needed.
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null, hum = null, muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function env(g, t, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function tone(type, f0, f1, dur, vol, when = 0) {
    if (!ctx || vol <= 0.001) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, f0, f1, type = 'lowpass', when = 0) {
    if (!ctx || vol <= 0.001) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  return {
    init,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    blaster(v = 1) { tone('sawtooth', 1800, 160, 0.2, 0.22 * v); tone('square', 1200, 90, 0.16, 0.07 * v); noise(0.06, 0.1 * v, 3000, 800, 'bandpass'); },
    rifle(v = 1) { tone('sawtooth', 1500, 220, 0.12, 0.16 * v); noise(0.05, 0.08 * v, 4000, 1000, 'bandpass'); },
    enemyShot(v = 1) { tone('sawtooth', 1100, 120, 0.2, 0.15 * v); tone('square', 700, 80, 0.18, 0.05 * v); },
    saberSwing() { tone('sawtooth', 140, 330, 0.22, 0.12); tone('sawtooth', 150, 90, 0.3, 0.07, 0.08); noise(0.25, 0.05, 600, 1500, 'bandpass'); },
    saberHit() { noise(0.25, 0.3, 6000, 400, 'highpass'); tone('square', 220, 60, 0.25, 0.14); tone('sawtooth', 90, 40, 0.3, 0.1); },
    saberOn() { tone('sawtooth', 60, 190, 0.4, 0.14); noise(0.35, 0.07, 300, 2000, 'bandpass'); },
    deflect() { tone('square', 2400, 900, 0.12, 0.12); tone('sawtooth', 320, 150, 0.2, 0.1); },
    explosion(v = 1) { noise(1.3, 0.6 * v, 1400, 50); tone('sine', 90, 28, 0.9, 0.45 * v); },
    pickup() { tone('square', 660, 660, 0.07, 0.09); tone('square', 990, 990, 0.1, 0.09, 0.07); },
    powerup() { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.09, 0.08, i * 0.07)); },
    hurt() { noise(0.15, 0.3, 1500, 300); tone('square', 180, 90, 0.15, 0.1); },
    door() { noise(0.7, 0.18, 400, 120, 'lowpass'); tone('sawtooth', 70, 50, 0.7, 0.05); },
    denied() { tone('square', 200, 200, 0.12, 0.1); tone('square', 150, 150, 0.2, 0.1, 0.13); },
    force() { noise(0.6, 0.35, 200, 3000, 'bandpass'); tone('sine', 120, 40, 0.6, 0.3); },
    empty() { tone('square', 300, 280, 0.04, 0.06); },
    death(v = 1) { noise(0.3, 0.2 * v, 900, 200); tone('sawtooth', 400, 80, 0.35, 0.07 * v); },
    droidDie(v = 1) { [1400, 1000, 700, 300].forEach((f, i) => tone('square', f, f * 0.8, 0.07, 0.06 * v, i * 0.06)); },
    alert(v = 1) { tone('square', 880, 880, 0.06, 0.05 * v); tone('square', 660, 660, 0.08, 0.05 * v, 0.07); },
    playerDie() { tone('sawtooth', 300, 40, 1.2, 0.2); noise(1, 0.2, 800, 60); },

    humStart() {
      if (!ctx || hum) return;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o1.frequency.value = 90;
      o2.type = 'sawtooth'; o2.frequency.value = 91.5;
      f.type = 'lowpass'; f.frequency.value = 380;
      g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
      o1.start(); o2.start();
      g.gain.setTargetAtTime(0.045, ctx.currentTime, 0.1);
      hum = { o1, o2, f, g };
    },
    humStop() {
      if (!hum) return;
      const h = hum; hum = null;
      h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => { h.o1.stop(); h.o2.stop(); }, 400);
    },
    humSet(x) {
      if (!hum) return;
      const t = ctx.currentTime;
      hum.o1.frequency.setTargetAtTime(90 + x * 60, t, 0.05);
      hum.o2.frequency.setTargetAtTime(91.5 + x * 62, t, 0.05);
      hum.g.gain.setTargetAtTime(0.04 + x * 0.05, t, 0.05);
      hum.f.frequency.setTargetAtTime(380 + x * 900, t, 0.05);
    },
  };
})();

// Luke's one-liners go through the browser's speech synthesizer (toggle with V).
const Voice = {
  enabled: true,
  say(text, opts = {}) {
    if (!this.enabled || !window.speechSynthesis) return;
    try {
      if (!opts.queue) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = opts.pitch ?? 0.6;
      u.rate = opts.rate ?? 1.05;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* speech is optional */ }
  },
};

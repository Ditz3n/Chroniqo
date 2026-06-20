// src/lib/utils/game-sounds.ts
// All game sounds loaded from /public/sounds/*.mp3
// See the sound file list in the project README for what to place there.

"use client";

//AudioContext (lazy, created after first user gesture)

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const Ctor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (Ctor) _ctx = new Ctor();
  }
  return _ctx;
}

// Buffer cache

const _buffers = new Map<string, AudioBuffer | null>();

async function loadBuffer(path: string): Promise<AudioBuffer | null> {
  if (_buffers.has(path)) return _buffers.get(path)!;
  const ctx = getCtx();
  if (!ctx) return null;
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.warn(`[Sound] ${path} → HTTP ${res.status}`);
      _buffers.set(path, null);
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    _buffers.set(path, decoded);
    return decoded;
  } catch (err) {
    console.warn(`[Sound] Failed to load ${path}:`, err);
    _buffers.set(path, null);
    return null;
  }
}

/** Play a sound file. Silently no-ops if the file is missing. */
function play(path: string, volume = 0.7) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  loadBuffer(path)
    .then((buffer) => {
      if (!buffer) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    })
    .catch(() => {});
}

// Preload a list of sounds so first play has no latency.
export function preloadSounds(paths: string[]) {
  paths.forEach((p) => loadBuffer(p).catch(() => {}));
}

// Sound paths

const S = {
  // Shared outcomes
  win: "/sounds/game-win.mp3",
  lose: "/sounds/game-lose.mp3",
  draw: "/sounds/game-draw.mp3",
  challenge: "/sounds/game-challenge.mp3",
  // Tic-Tac-Toe
  tttPlace: "/sounds/ttt-place.mp3",
  tttOpponent: "/sounds/ttt-opponent.mp3",
  // Connect Four
  cfDrop: "/sounds/cf-drop.mp3",
  // Knucklebones
  kbRoll: "/sounds/kb-roll.mp3",
  kbPlace: "/sounds/kb-place.mp3",
  kbSelect: "/sounds/kb-select.mp3",
  kbDestroy: "/sounds/kb-destroy.mp3",
  kbMusic: "/sounds/knucklebones-music.mp3",
} as const;

// Tic-Tac-Toe

export const ticTacToeSounds = {
  place: () => play(S.tttPlace),
  opponentPlace: () => play(S.tttOpponent),
  win: () => play(S.win),
  lose: () => play(S.lose),
  draw: () => play(S.draw),
};

// Connect Four

export const connectFourSounds = {
  drop: () => play(S.cfDrop),
  win: () => play(S.win),
  lose: () => play(S.lose),
  draw: () => play(S.draw),
};

// Knucklebones

let _kbMusicBuffer: AudioBuffer | null = null;
let _kbMusicSource: AudioBufferSourceNode | null = null;
let _kbMusicGain: GainNode | null = null;
const KB_TARGET_VOL = 0.28;
const KB_FADE_DURATION = 2.0;

async function loadKbMusicBuffer(): Promise<AudioBuffer | null> {
  const ctx = getCtx();
  if (!ctx) return null;
  if (_kbMusicBuffer) return _kbMusicBuffer;
  try {
    console.log("[KB Music] Fetching:", S.kbMusic);
    const res = await fetch(S.kbMusic);
    console.log("[KB Music] Fetch status:", res.status, res.ok, "→", res.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    _kbMusicBuffer = await ctx.decodeAudioData(arrayBuf);
    console.log(
      "[KB Music] Decoded OK - duration:",
      _kbMusicBuffer.duration.toFixed(1),
      "s",
    );
    return _kbMusicBuffer;
  } catch (err) {
    console.error("[KB Music] Failed to load:", err);
    return null;
  }
}

export const knuckleBonesSounds = {
  roll: () => play(S.kbRoll),
  place: () => play(S.kbPlace),
  select: () => play(S.kbSelect),
  destroy: () => play(S.kbDestroy),
  win: () => play(S.win),
  lose: () => play(S.lose),
  draw: () => play(S.draw),

  startMusic: async () => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
    if (_kbMusicSource) return;
    const buffer = await loadKbMusicBuffer();
    if (!buffer) return;
    if (_kbMusicSource) return; // race guard

    _kbMusicGain = ctx.createGain();
    _kbMusicGain.gain.setValueAtTime(0, ctx.currentTime);
    _kbMusicGain.gain.linearRampToValueAtTime(
      KB_TARGET_VOL,
      ctx.currentTime + KB_FADE_DURATION,
    );
    _kbMusicGain.connect(ctx.destination);

    _kbMusicSource = ctx.createBufferSource();
    _kbMusicSource.buffer = buffer;
    _kbMusicSource.loop = true;
    _kbMusicSource.connect(_kbMusicGain);
    _kbMusicSource.start();
  },

  stopMusic: () => {
    const ctx = getCtx();
    if (!ctx || !_kbMusicGain || !_kbMusicSource) return;
    const src = _kbMusicSource;
    const gain = _kbMusicGain;
    _kbMusicSource = null;
    _kbMusicGain = null;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(() => {
      try {
        src.stop();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    }, 1600);
  },
};

// Generic background music manager

interface MusicTrack {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gain: GainNode | null;
}

const tracks: Record<string, MusicTrack> = {};
const TARGET_VOL = 0.22;
const FADE_IN = 1.5;

async function startTrack(path: string) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});

  if (!tracks[path]) tracks[path] = { buffer: null, source: null, gain: null };
  const track = tracks[path];

  if (track.source) return; // already playing

  const buffer = await loadBuffer(path);
  if (!buffer) return;
  if (track.source) return; // race guard

  track.gain = ctx.createGain();
  track.gain.gain.setValueAtTime(0, ctx.currentTime);
  track.gain.gain.linearRampToValueAtTime(
    TARGET_VOL,
    ctx.currentTime + FADE_IN,
  );
  track.gain.connect(ctx.destination);

  track.source = ctx.createBufferSource();
  track.source.buffer = buffer;
  track.source.loop = true;
  track.source.connect(track.gain);
  track.source.start();
}

function stopTrack(path: string) {
  const ctx = getCtx();
  const track = tracks[path];
  if (!ctx || !track?.source || !track?.gain) return;

  const src = track.source;
  const gain = track.gain;
  track.source = null;
  track.gain = null;

  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  setTimeout(() => {
    try {
      src.stop();
      gain.disconnect();
    } catch {
      /* stopped */
    }
  }, 1300);
}

export const gameMusic = {
  startTicTacToe: () => startTrack("/sounds/ttt-music.mp3"),
  stopTicTacToe: () => stopTrack("/sounds/ttt-music.mp3"),
  startConnectFour: () => startTrack("/sounds/cf-music.mp3"),
  stopConnectFour: () => stopTrack("/sounds/cf-music.mp3"),
};

export const systemSounds = {
  challenge: () => play(S.challenge),
};

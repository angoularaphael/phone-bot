'use strict';

/**
 * Génère une courte musique d'accueil (WAV 8 kHz, téléphone).
 * Usage : node scripts/gen-intro-wav.js
 */

const fs   = require('fs');
const path = require('path');

const RATE = 8000;
const DURATION = 3.1;
const N = Math.floor(RATE * DURATION);
const samples = new Float64Array(N);

function noteHz(name) {
    const map = {
        C3: 130.81, E3: 164.81, G3: 196.00, C4: 261.63,
        E4: 329.63, G4: 392.00, C5: 523.25,
    };
    return map[name];
}

function env(t, attack, decay) {
    if (t < 0) return 0;
    if (t < attack) return t / attack;
    return Math.exp(-(t - attack) / decay);
}

function addTone(start, dur, hz, gain, attack, decay) {
    const i0 = Math.floor(start * RATE);
    const n  = Math.floor(dur * RATE);
    for (let i = 0; i < n && i0 + i < N; i += 1) {
        const t = i / RATE;
        const a = env(t, attack, decay);
        samples[i0 + i] += gain * a * Math.sin(2 * Math.PI * hz * t);
    }
}

function addThump(start, gain) {
    const i0 = Math.floor(start * RATE);
    const n  = Math.floor(0.22 * RATE);
    for (let i = 0; i < n && i0 + i < N; i += 1) {
        const t = i / RATE;
        const hz = 95 - 40 * (t / 0.22);
        samples[i0 + i] += gain * Math.exp(-t / 0.08) * Math.sin(2 * Math.PI * hz * t);
    }
}

addThump(0.02, 0.55);
addTone(0.12, 1.4, noteHz('C3'), 0.18, 0.02, 0.55);
addTone(0.28, 1.2, noteHz('G3'), 0.20, 0.02, 0.45);
addTone(0.44, 1.1, noteHz('C4'), 0.22, 0.015, 0.40);
addTone(0.62, 1.0, noteHz('E4'), 0.16, 0.015, 0.35);
addTone(0.88, 1.5, noteHz('G4'), 0.14, 0.02, 0.55);
addTone(1.15, 1.6, noteHz('C5'), 0.12, 0.02, 0.70);
addThump(1.55, 0.28);

let peak = 0;
for (let i = 0; i < N; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
const scale = peak > 0 ? 0.82 / peak : 1;

const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i += 1) {
    const fade = i > N - RATE * 0.35 ? (N - i) / (RATE * 0.35) : 1;
    const v = Math.max(-1, Math.min(1, samples[i] * scale * fade));
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = path.join(__dirname, '..', 'assets', 'intro.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`Wrote ${out} (${(pcm.length / 2 / RATE).toFixed(2)} s)`);

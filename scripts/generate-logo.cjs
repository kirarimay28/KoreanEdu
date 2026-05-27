// Generates logo.png using Noto Serif CJK Bold — font-rendered, no manual strokes
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

registerFont('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', {
  family: 'NotoSerif', weight: 'bold',
});

const TEXT = '나랏말ᄊᆞ미';
const FONT_SIZE = 52;
const PAD_X = 10;
const PAD_Y = 8;
const SCALE = 2; // 2× retina

// Measure actual text width at 1× scale
const probe = createCanvas(800, 100);
const pctx = probe.getContext('2d');
pctx.font = `bold ${FONT_SIZE}px NotoSerif`;
pctx.textBaseline = 'alphabetic';
const m = pctx.measureText(TEXT);
const textW = m.width;
const textH = FONT_SIZE * 1.25; // cap + descender headroom

const W = Math.ceil(textW + PAD_X * 2) * SCALE;
const H = Math.ceil(textH + PAD_Y * 2) * SCALE;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Transparent background
ctx.clearRect(0, 0, W, H);

ctx.scale(SCALE, SCALE);
ctx.font = `bold ${FONT_SIZE}px NotoSerif`;
ctx.fillStyle = '#1a1a2e';
ctx.textBaseline = 'top';
ctx.fillText(TEXT, PAD_X, PAD_Y);

const outPath = path.join(__dirname, '..', 'public', 'logo.png');
fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
console.log(`Saved ${W}×${H}px (displayed at ${W/SCALE}×${H/SCALE}px) → ${outPath}`);

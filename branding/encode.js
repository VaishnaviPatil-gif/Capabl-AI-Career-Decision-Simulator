const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const OUT = path.join(__dirname, "_frames");
const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).sort();

const raw = files.map((f) => PNG.sync.read(fs.readFileSync(path.join(OUT, f))));
// Prepend the final (full) frame as the poster, so any static first-frame
// preview shows the complete composition; the loop then reads as
// "hold full → replay the count-up → hold full".
const frames = [raw[raw.length - 1], ...raw];
const { width, height } = frames[0];

// One global palette built from the final (full) frame → consistent colors,
// no inter-frame flicker, smaller file.
const last = new Uint8Array(frames[frames.length - 1].data);
const palette = quantize(last, 256, { format: "rgb565" });

const gif = GIFEncoder();
frames.forEach((png, i) => {
  const rgba = new Uint8Array(png.data);
  const index = applyPalette(rgba, palette, "rgb565");
  const isPoster = i === 0;
  const isLast = i === frames.length - 1;
  gif.writeFrame(index, width, height, {
    palette: i === 0 ? palette : undefined, // global table written once
    delay: isPoster ? 1500 : isLast ? 1600 : 70,
    repeat: 0, // loop forever
  });
});
gif.finish();

const bytes = Buffer.from(gif.bytes());
const outPath = path.join(__dirname, "devpost-thumbnail.gif");
fs.writeFileSync(outPath, bytes);
console.log(`GIF written: ${outPath}`);
console.log(`Frames: ${frames.length} | ${width}x${height} | ${(bytes.length / 1024 / 1024).toFixed(2)} MB`);

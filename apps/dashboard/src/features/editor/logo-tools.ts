// Logo clean-up on the owner's device (decision T76 C7, hand-written with the founder's yes): trim empty
// edges and make the logo square, and remove a white box around it. Canvas only, nothing is sent anywhere.

const MAX_SIDE = 1024;
// How far a pixel may be from the background before it counts as the logo (0 to 441).
const SAME_AS_EDGE = 40;
// Near-white for "Remove white background".
const WHITE_DISTANCE = 48;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('logo_unreadable'));
    image.src = src;
  });
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('logo_unreadable');
  return { canvas, context };
}

function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('logo_unreadable'));
      else resolve(new File([blob], name, { type: 'image/png' }));
    }, 'image/png');
  });
}

function distance(data: Uint8ClampedArray, i: number, r: number, g: number, b: number): number {
  return Math.hypot((data[i] ?? 0) - r, (data[i + 1] ?? 0) - g, (data[i + 2] ?? 0) - b);
}

/**
 * Trims empty edges (see-through, or the colour of the corners) and pads the logo to a square with a
 * little room, so it sits well in a circle or a rounded square. A logo that fills its square stays as is.
 */
export async function squareLogo(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const { context } = canvasOf(w, h);
    context.drawImage(image, 0, 0, w, h);
    const data = context.getImageData(0, 0, w, h).data;

    const corner = 0;
    const clearEdge = (data[corner + 3] ?? 255) < 16;
    const [r, g, b] = [data[corner] ?? 255, data[corner + 1] ?? 255, data[corner + 2] ?? 255];
    let top = h;
    let left = w;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const alpha = data[i + 3] ?? 0;
        const content = clearEdge
          ? alpha >= 16
          : alpha >= 16 && distance(data, i, r, g, b) > SAME_AS_EDGE;
        if (!content) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < 0) return file;
    const boxW = right - left + 1;
    const boxH = bottom - top + 1;
    // Nothing to trim and already square: keep the owner's file.
    if (boxW > w * 0.97 && boxH > h * 0.97 && Math.abs(w - h) <= 2) return file;
    const side = Math.round(Math.max(boxW, boxH) * 1.12);
    const out = canvasOf(side, side);
    if (!clearEdge) {
      out.context.fillStyle = `rgb(${r} ${g} ${b})`;
      out.context.fillRect(0, 0, side, side);
    }
    out.context.drawImage(
      image,
      left / scale,
      top / scale,
      boxW / scale,
      boxH / scale,
      Math.round((side - boxW) / 2),
      Math.round((side - boxH) / 2),
      boxW,
      boxH,
    );
    return await toFile(out.canvas, 'logo.png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Makes the white around a logo see-through: a fill from the edges through near-white pixels only, so white
 * inside the logo (a white burger on red) stays. Returns a PNG.
 */
export async function removeWhiteBackground(src: string): Promise<File> {
  const image = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const { canvas, context } = canvasOf(w, h);
  context.drawImage(image, 0, 0, w, h);
  const pixels = context.getImageData(0, 0, w, h);
  const data = pixels.data;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    seen[p] = 1;
    if (distance(data, p * 4, 255, 255, 255) <= WHITE_DISTANCE) stack.push(p);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const p = stack.pop();
    if (p === undefined) break;
    const i = p * 4;
    // Softer edge: the closer to white, the clearer.
    const d = distance(data, i, 255, 255, 255);
    data[i + 3] = Math.round(Math.min(255, (d / WHITE_DISTANCE) * 160));
    const x = p % w;
    const y = (p - x) / w;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  context.putImageData(pixels, 0, 0);
  return toFile(canvas, 'logo.png');
}

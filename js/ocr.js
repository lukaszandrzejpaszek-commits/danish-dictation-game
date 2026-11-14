function createImageCanvas(image) {
  const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function enhanceImage(source, contrast) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.filter = 'blur(12px)';
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  const background = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const output = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < original.data.length; i += 4) {
    const difference = (background.data[i] + background.data[i + 1] + background.data[i + 2]
      - original.data[i] - original.data[i + 1] - original.data[i + 2]) / 3;
    const value = Math.max(0, Math.min(255, 255 - difference * contrast));
    output.data[i] = output.data[i + 1] = output.data[i + 2] = value;
    output.data[i + 3] = 255;
  }
  ctx.putImageData(output, 0, 0);
  return canvas;
}

export function classifyWordFromImage(canvas, bbox) {
  if (!bbox) return null;
  const x = Math.max(0, Math.floor(bbox.x0));
  const y = Math.max(0, Math.floor(bbox.y0));
  const width = Math.min(canvas.width, Math.ceil(bbox.x1)) - x;
  const height = Math.min(canvas.height, Math.ceil(bbox.y1)) - y;
  if (width <= 0 || height <= 0) return null;

  const pixels = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, width, height).data;
  const samples = [];
  for (let i = 0; i < pixels.length; i += 4) {
    samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  // Compare dark ink with the light paper in the same word box.
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const count = Math.max(1, Math.floor(samples.length * 0.2));
  const average = (start) => {
    const sum = [0, 0, 0];
    for (let i = start; i < start + count; i += 1) {
      for (let channel = 0; channel < 3; channel += 1) sum[channel] += samples[i][channel];
    }
    return sum.map((value) => value / count);
  };
  const foreground = average(0);
  const background = average(samples.length - count);
  if (background.some((value) => value < 1)) return null;
  const [red, green, blue] = foreground.map((value, i) => value / background[i]);
  const redGreen = red - green;
  const redBlue = red - blue;

  if (foreground[0] >= 100 && redGreen >= 0.15 && redBlue > 0.14 && redGreen / redBlue >= 0.55) return 'red';
  if (foreground[0] >= 100 && redBlue > 0.14
      && (redGreen >= 0.065 || (red > 0.8 && redGreen > -0.02))) return 'yellow';
  if ((foreground[0] >= 90 && redGreen < 0.02 && redBlue > 0.055)
      || (foreground[1] >= 60 && green - red > 0.05 && green - blue > 0.05)) return 'green';
  return null;
}

function overlaps(first, second) {
  const width = Math.max(0, Math.min(first.x1, second.x1) - Math.max(first.x0, second.x0));
  const height = Math.max(0, Math.min(first.y1, second.y1) - Math.max(first.y0, second.y0));
  const firstArea = (first.x1 - first.x0) * (first.y1 - first.y0);
  const secondArea = (second.x1 - second.x0) * (second.y1 - second.y0);
  return width * height > 0.6 * Math.min(firstArea, secondArea);
}

export async function handleImageUpload(file, onWordsAdded, statusTextSetter) {
  if (!file) return;
  if (!window.Tesseract) {
    console.error('OCR is unavailable because Tesseract could not be loaded.');
    if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
    return;
  }

  if (typeof statusTextSetter === 'function') statusTextSetter('ocrLoading');

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    image.onload = async () => {
      let worker;
      try {
        const source = createImageCanvas(image);
        const enhanced = enhanceImage(source, 4);
        const highContrast = enhanceImage(source, 6);
        const scale = Math.min(2, 3000 / Math.max(source.width, source.height));
        const enlarged = document.createElement('canvas');
        enlarged.width = Math.round(source.width * scale);
        enlarged.height = Math.round(source.height * scale);
        enlarged.getContext('2d').drawImage(highContrast, 0, 0, enlarged.width, enlarged.height);
        worker = await Tesseract.createWorker('dan+eng');
        const matches = [];

        for (const [input, factor] of [[enhanced, 1], [enlarged, scale]]) {
          const result = await worker.recognize(input);
          (result.data.words || []).forEach((word) => {
            const text = (word.text || '').replace(/[^\p{L}-]/gu, '').trim();
            if (text.length < 2 || word.confidence < 35 || !word.bbox || /\p{N}/u.test(word.text)) return;
            const bbox = {
              x0: word.bbox.x0 / factor, y0: word.bbox.y0 / factor,
              x1: word.bbox.x1 / factor, y1: word.bbox.y1 / factor
            };
            const color = classifyWordFromImage(source, bbox);
            if (!color) return;
            const match = matches.find((item) => overlaps(item.bbox, bbox));
            const candidate = { text, color, bbox, confidence: word.confidence };
            if (!match) matches.push(candidate);
            else if (candidate.confidence > match.confidence) Object.assign(match, candidate);
          });
        }

        const wordsByColor = { green: [], yellow: [], red: [] };
        matches.forEach(({ text, color }) => wordsByColor[color].push(text));
        onWordsAdded(wordsByColor);
        if (typeof statusTextSetter === 'function') {
          statusTextSetter(matches.length ? 'ocrDone' : 'ocrNoColoredWords', { n: matches.length });
        }
        resolve(wordsByColor);
      } catch (error) {
        console.error('Could not recognize colored words.', error);
        if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
        resolve(null);
      } finally {
        if (worker) {
          try { await worker.terminate(); }
          catch (error) { console.error('Could not stop the OCR worker.', error); }
        }
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = (error) => {
      console.error('Could not load the word-list image.', error);
      if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

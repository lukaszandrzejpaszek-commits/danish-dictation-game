export function classifyWordFromImage(image, bbox) {
  if (!bbox) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 1;
  canvas.height = 1;

  try {
    ctx.drawImage(image, Math.max(0, bbox.x0), Math.max(0, bbox.y0), Math.max(1, bbox.x1 - bbox.x0), Math.max(1, bbox.y1 - bbox.y0), 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta < 35) return null;

    let hue = 0;
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);

    if (hue >= 75 && hue < 170) return 'green';
    if (hue >= 35 && hue < 75) return 'yellow';
    if (hue < 25 || hue >= 330) return 'red';
    return null;
  } catch (error) {
    return null;
  }
}

export async function handleImageUpload(file, onWordsAdded, statusTextSetter) {
  if (!file) return;
  if (!window.Tesseract) {
    if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
    return;
  }

  if (typeof statusTextSetter === 'function') statusTextSetter('ocrLoading');

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    image.onload = async () => {
      try {
        const result = await Tesseract.recognize(file, 'dan+eng');
        const wordsByColor = { green: [], yellow: [], red: [] };

        (result.data.words || []).forEach((word) => {
          const cleaned = (word.text || '').replace(/[^\p{L}\p{N}-]/gu, '').trim();
          if (cleaned.length < 2 || word.confidence < 35) return;
          const bucket = classifyWordFromImage(image, word.bbox) || 'green';
          wordsByColor[bucket] = wordsByColor[bucket] || [];
          wordsByColor[bucket].push(cleaned);
        });

        onWordsAdded(wordsByColor);

        if (typeof statusTextSetter === 'function') {
          statusTextSetter('ocrDone', { n: Object.values(wordsByColor).flat().length });
        }
        resolve(wordsByColor);
      } catch (error) {
        console.error(error);
        if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      if (typeof statusTextSetter === 'function') statusTextSetter('ocrError');
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

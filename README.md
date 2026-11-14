# Ord-eventyr – dansk diktat

A cheerful, mobile-friendly Danish spelling game for children aged 9–11. The app is a static website: open `index.html` in a modern browser or publish the repository with GitHub Pages.

## Features

- Upload or drag in an image of a word list; OCR runs in the browser with Tesseract.js (`dan+eng`).
- Extract colored words into Green, Yellow, and Red sections while ignoring black text. Review and edit the words after OCR; recognition and color extraction depend on image quality and lighting.
- Pick a color (its button shows the unique word count) and practise those words in a random order. The round length matches the number of unique words in the selected color list.
- Choose local Danish Piper neural speech or a browser-installed voice for each practice round, then switch between them during dictation to compare the current word. The Piper model (~63 MB) is downloaded on first use, cached in the browser, and fetched again only if it is missing; speech is generated on-device.
- Adjust speaking speed from 0.5× to 1.5× of the voice's default speed for the next playback. Submit an answer with Enter or the answer button.
- Create player profiles with avatars and colors; see the active player in the header.
- Score, percentage, per-word feedback, and attempt history saved in browser localStorage, including the attempt date and time.
- Download attempt results as a semicolon-delimited CSV with UTF-8 BOM for spreadsheet compatibility.
- **Pixel Hero Avatar Maker:** upload a photo or drawing and create a generic retro platform-game pixel-art avatar locally in your browser. [Open the avatar maker](avatar-maker.html).

The avatar maker creates a general pixel-art effect, not Mario characters or official Mario artwork. Images stay on the device and are not uploaded.

## Run

Serve the repository directory using any static web server, then open the local address in a current browser. For example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. OCR loads Tesseract.js from jsDelivr. If Piper is selected, the first spoken word downloads the Danish Piper model (about 63 MB) and its config from Hugging Face, plus the speech runtime files from esm.sh and unpkg. The model and config are saved in the browser Cache API and reused while available; only missing cached assets are downloaded again. Clearing site data or browser storage eviction removes the cache. Piper generates speech on-device; the word text is not sent to those hosts. Browser speech is available as an alternative for each round and can be selected during dictation to replay a word. Review the [Danish voice model card](https://huggingface.co/rhasspy/piper-voices/tree/main/da/da_DK/talesyntese/medium) before redistributing the model or using it commercially.

When deploying JavaScript changes, update the matching `v` query strings on the app's local module imports and script tag so browsers fetch a consistent version of the modules.

To run the OCR color-filter checks, serve the repository and open `tests/ocr.html` in the browser.

# Ord-eventyr – dansk diktat

A cheerful, mobile-friendly Danish spelling game for children aged 9–11. The app is a static website: open `index.html` in a modern browser or publish the repository with GitHub Pages.

## Features

- Upload or drag in an image of a word list; OCR runs in the browser with Tesseract.js (`dan+eng`).
- Extract words into Green, Blue, Black, and Orange sections using section headings and detected text colors. Review and edit the words after OCR—color extraction depends on the image quality and lighting.
- Pick a color and practise **all** available words in a random order. The round length matches the number of unique words in the selected color list.
- Danish speech synthesis (`da-DK`), replay button, answer checking, and Æ/Ø/Å insertion buttons.
- Score, percentage, per-word feedback, and attempt history saved in browser localStorage.
- Download attempt results as a semicolon-delimited CSV with UTF-8 BOM for spreadsheet compatibility.

## Run

Serve the repository directory using any static web server, then open the local address in a current browser. For example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. OCR loads Tesseract.js from jsDelivr, and the browser must provide Danish speech synthesis for Danish audio. If a browser has no Danish voice installed, it may use its default voice.

# convertly-api

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight REST API that converts and compresses images. Upload any image and get back a smaller, optimized file in WebP, PNG, or JPEG — with optional resizing and quality control.

## Features

- Convert images between **WebP**, **PNG**, and **JPEG**
- Resize on the fly (`width` parameter, aspect ratio preserved, never enlarged)
- Lossy/lossless quality control (1–100, default 80)
- 10 MB upload limit with strict image MIME-type validation
- In-memory processing via `sharp` — no temp files on disk
- Clear HTTP error responses for every invalid input

## Quick Start

```bash
npm install
npm start
```

The API listens on `http://localhost:3000` (override with the `PORT` environment variable).

> **Note:** `sharp` ships prebuilt binaries for most platforms, but on some systems it may need build tools (e.g. `python3`, `make`, `g++`) to compile its native bindings during `npm install`. See the [sharp installation docs](https://sharp.pixelplumbing.com/install) if the install fails.

For auto-reload during development:

```bash
npm run dev
```

## API

### `GET /health`

Health check.

```json
{ "status": "ok" }
```

### `POST /api/convert`

Convert/compress an uploaded image.

| Parameter | Location | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `image` | form field | file | (required) | The image to convert (≤ 10 MB, image MIME types only) |
| `to` | query or form | string | `webp` | Target format: `webp`, `png`, or `jpeg` |
| `width` | query or form | int | (original) | Target width in px (1–4000), aspect ratio preserved |
| `quality` | query or form | int | `80` | Output quality (1–100) |

Response: the converted image file with the correct `Content-Type` and a `Content-Disposition: attachment; filename="<name>.<ext>"` header.

**Example:**

```bash
curl -F "image=@photo.jpg" \
  "http://localhost:3000/api/convert?to=webp&width=1200&quality=80" \
  --output out.webp
```

### Error cases

| Status | When |
|--------|------|
| 400 | No file in the `image` field |
| 400 | File is not an image MIME type |
| 400 | File exceeds 10 MB |
| 400 | `to` is not `webp`, `png`, or `jpeg` |
| 400 | `width` is not an integer in 1–4000 |
| 400 | `quality` is not an integer in 1–100 |
| 404 | Unknown route |
| 502 | `sharp` failed to decode/encode the file (corrupt or unsupported data) |
| 500 | Unexpected internal error |

## Structure

```
convertly-api/
├── server.js      # Express app, upload + convert endpoints, error handling
├── package.json   # Dependencies and scripts
├── .gitignore
├── LICENSE
└── README.md
```

## Tech Stack

- **Node.js** + **Express** — HTTP server and routing
- **multer** — multipart upload handling (in-memory storage)
- **sharp** — high-performance image resize/encode pipeline
- **cors** — cross-origin request support

## Author

**Adil Abdullah Khan** — BS Information Technology, Thal University Bhakkar, Pakistan

- Email: adilabdullahkhan35@gmail.com
- GitHub: https://github.com/adilabdullah15

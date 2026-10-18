# Notices

Pear Notes for macOS, Windows and Linux is source-available under the PolyForm Strict License 1.0.0 (see `LICENSE`). It includes third-party software, fonts and models, each under its own license.

## Fonts

Bundled fonts are licensed under the SIL Open Font License 1.1. Their copyright lines and the full license text are in `src/assets/fonts/OFL.txt`.

- IBM Plex Mono
- Inter
- Lora
- Newsreader
- Outfit

## On-device AI models

Models are not part of this repository or the app package. When the user turns on an on-device AI feature, the app downloads the model through the QVAC SDK registry (https://qvac.tether.io).

| Model | Used for | License |
|---|---|---|
| Whisper tiny and base | Voice typing and transcription, Lite and Standard tiers | MIT |
| Silero VAD 5.1.2 | Voice activity detection | MIT |
| NVIDIA Parakeet TDT 0.6B v3 | Voice typing and transcription, Best tier | CC-BY-4.0 |
| EasyOCR Latin recognizer and CRAFT detector | Extract text | Apache-2.0 (recognizer), MIT (detector) |
| Qwen3 0.6B, 1.7B, 4B, 8B | Summaries, titles, writing tools, Ask | Apache-2.0 |
| Qwen3.5 0.8B multimodal | Describe images; Extract text, Best tier | Apache-2.0 |
| EmbeddingGemma 300M | Vault search index | Gemma Terms of Use (https://ai.google.dev/gemma/terms) |
| Bergamot translation models | Translate | MPL-2.0 |

Parakeet TDT is provided by NVIDIA under CC-BY-4.0. Gemma is provided under and subject to the Gemma Terms of Use; use of EmbeddingGemma must follow the Gemma Prohibited Use Policy (https://ai.google.dev/gemma/prohibited_use_policy).

## Software dependencies

Direct dependencies and their licenses are listed below. Each package, and each of its own dependencies, includes its license in `node_modules/<package>/`. No dependency is used under a copyleft license; `node-forge` and `unorm` are dual-licensed and used under their BSD and MIT terms.

The Pear and Holepunch runtime (Bare, Autobase, Hypercore, Hyperswarm and related modules) is licensed under Apache-2.0.

Includes runtime and build dependencies; the renderer bundles some of its packages from `devDependencies`.

| Package | Version | License |
|---|---|---|
| @electron-forge/cli | 7.11.2 | MIT |
| @electron-forge/maker-deb | 7.11.2 | MIT |
| @electron-forge/maker-dmg | 7.11.2 | MIT |
| @electron-forge/maker-msix | 7.11.2 | MIT |
| @electron-forge/maker-pkg | 7.11.2 | MIT |
| @electron-forge/maker-rpm | 7.11.2 | MIT |
| @electron-forge/maker-zip | 7.11.2 | MIT |
| @electron-forge/plugin-fuses | 7.11.2 | MIT |
| @electron/fuses | 1.8.0 | MIT |
| @eslint/js | 9.39.3 | MIT |
| @qvac/sdk | 0.21.0 | Apache-2.0 |
| @reduxjs/toolkit | 2.12.0 | MIT |
| @swmansion/argent | 0.16.0 | Apache-2.0 |
| @tailwindcss/vite | 4.2.1 | MIT |
| @tiptap/extension-bubble-menu | 3.20.0 | MIT |
| @tiptap/extension-code-block-lowlight | 3.20.0 | MIT |
| @tiptap/extension-highlight | 3.20.0 | MIT |
| @tiptap/extension-image | 3.20.0 | MIT |
| @tiptap/extension-link | 3.20.0 | MIT |
| @tiptap/extension-placeholder | 3.20.0 | MIT |
| @tiptap/extension-strike | 3.20.0 | MIT |
| @tiptap/extension-subscript | 3.20.0 | MIT |
| @tiptap/extension-superscript | 3.20.0 | MIT |
| @tiptap/extension-table | 3.20.0 | MIT |
| @tiptap/extension-table-cell | 3.20.0 | MIT |
| @tiptap/extension-table-header | 3.20.0 | MIT |
| @tiptap/extension-table-row | 3.20.0 | MIT |
| @tiptap/extension-task-item | 3.20.0 | MIT |
| @tiptap/extension-task-list | 3.20.0 | MIT |
| @tiptap/extension-text-align | 3.20.0 | MIT |
| @tiptap/extension-underline | 3.20.0 | MIT |
| @tiptap/react | 3.20.0 | MIT |
| @tiptap/starter-kit | 3.20.0 | MIT |
| @vitejs/plugin-react | 5.1.4 | MIT |
| brittle | 3.19.1 | Apache-2.0 |
| buffer | 5.7.1 | MIT |
| concurrently | 10.0.5 | MIT |
| corestore | 7.12.6 | MIT |
| electron | 40.10.5 | MIT |
| electron-forge-plugin-universal-prebuilds | 1.0.0 | Apache-2.0 |
| eslint | 9.39.3 | MIT |
| eslint-config-prettier | 10.1.8 | MIT |
| eslint-plugin-react | 7.37.5 | MIT |
| eslint-plugin-react-hooks | 7.0.1 | MIT |
| eslint-plugin-react-refresh | 0.4.26 | MIT |
| eslint-plugin-simple-import-sort | 14.0.0 | MIT |
| events | 3.3.0 | MIT |
| framed-stream | 1.0.1 | MIT |
| globals | 16.5.0 | MIT |
| hyperswarm | 4.17.2 | MIT |
| i18next | 26.3.6 | MIT |
| javascript-obfuscator | 5.7.0 | BSD-2-Clause |
| lowlight | 3.3.0 | MIT |
| lucide-react | 0.553.0 | ISC |
| pdfjs-dist | 6.3.289 | Apache-2.0 |
| pear-runtime | 1.3.0 | Apache-2.0 |
| prettier | 3.8.1 | MIT |
| prettier-config-holepunch | 2.0.0 | Apache-2.0 |
| prettier-config-standard | 7.0.0 | BSD-3-Clause |
| qrcode.react | 4.2.0 | ISC |
| react | 19.2.4 | MIT |
| react-dom | 19.2.4 | MIT |
| react-i18next | 17.0.10 | MIT |
| react-redux | 9.3.0 | MIT |
| react-resizable | 3.1.3 | MIT |
| streamx | 2.28.1 | MIT |
| tailwindcss | 4.2.1 | MIT |
| terser | 5.51.2 | BSD-2-Clause |
| vite | 7.3.1 | MIT |
| which-runtime | 1.3.2 | Apache-2.0 |

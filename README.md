# Pear Notes for macOS, Windows and Linux

Private notes, encrypted on your devices and synced peer to peer. There's no account and no server: your devices find each other and sync directly.

Website and downloads: https://amreshvs.github.io/pear-notes/

## What's in the app

- Notes, folders, checklists, images, PDFs, audio and file attachments, with full-text search
- Sync between your computers, phones and tablets over a peer-to-peer network (Holepunch: Hyperswarm, Autobase, Hyperdrive)
- Encryption at rest, with the vault key kept in the system keychain
- Note lock with Touch ID, Windows Hello or a custom password, plus screenshot protection
- Encrypted backups
- On-device AI that never leaves the computer: voice typing, transcription, text extraction, summaries, translation, and Ask your notes

## Source-available, not open source

This repository is published so you can read and audit how the app works. It is licensed under the [PolyForm Strict License 1.0.0](LICENSE): you may read and study the code for non-commercial purposes, but you may not modify it, redistribute it, or publish it as an app. The name, logo and icon are covered separately by [TRADEMARK.md](TRADEMARK.md).

**This repository doesn't build on its own.** The backend, sync and encryption logic live in `@pear-notes/core`, which is private, and the app installs it from a private repository.

Pull requests aren't accepted. Bug reports are welcome in Issues. For security issues, see [SECURITY.md](SECURITY.md).

## Layout

| Path | What it is |
|---|---|
| `electron/` | Main process: windows, IPC, keychain storage, the Bare sidecar that runs core, and the on-device AI host |
| `src/` | Renderer (React + Vite): components, hooks, platform logic and locales |
| `local-ai/` | Isolated package for the QVAC on-device AI SDK |
| `native/pear-device-auth/` | Native addon for Touch ID, Windows Hello and polkit |
| `scripts/`, `forge.config.cjs` | Build, signing and release for the Mac App Store, DMG, Microsoft Store and Linux |
| `docs/` | Release guides per platform |

## License

Copyright 2025–2026 Amresh Vs. Licensed under the [PolyForm Strict License 1.0.0](LICENSE). Third-party software, fonts and models are listed in [NOTICE.md](NOTICE.md).

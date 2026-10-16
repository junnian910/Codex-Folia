# Third-party components

- Folia 0.7.19, https://github.com/chthollyphile/folia-major, AGPL-3.0; full modified corresponding source is included at `source/folia-source.zip`.
- Node.js 24.18.0, Windows x64. The unmodified runtime is included with its complete license and bundled library notices in `LICENSE-Node.txt`. License source: https://raw.githubusercontent.com/nodejs/node/v24.18.0/LICENSE
- The local music backend dependencies are pinned in `package-lock.json`. Their original license and notice files remain inside `node_modules`.
- Distribution cleanup removes a packaged lint log and editor configuration, and replaces an unused upstream YouTube API string in a comment with a placeholder; executable dependency behavior is unchanged.
- The installer is produced with NSIS 3. NSIS runtime notice is included in `LICENSE-NSIS.txt`.

Integration changes include Codex embedding, direct transport, layout editing, foreground subtitles, independent player widgets, and an independent launcher. No personal account, token, profile, playback record, media cache or screenshots are distributed.

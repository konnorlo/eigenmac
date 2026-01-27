# eigenmac

A Zetamac-style eigenvalue drilling game. Solve eigenvalues of randomly generated matrices under a time limit. Includes a drawing notepad, bouncing DVD boxes, and a results screen with dynamic background.

## Features
- Timed eigenvalue drills with auto-check inputs
- Matrix sizes from 2×2 up to 5×5 (random within a chosen range)
- Integer-only eigenvalues, bounded entries
- Drawing pad for scratch work (draw anywhere)
- Animated bouncing image boxes + confetti
- Best score tracking and results backgrounds

## Play

Play here!:
https://konnorlo.github.io/eigenmac/

## Multiplayer (local)
1. Install deps:

```bash
npm install
```

2. Start the WebSocket server:

```bash
npm start
```

3. Open `index.html` and use the Multiplayer panel.

Server URL is set by `WS_URL` at the top of `script.js`.

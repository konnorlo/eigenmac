# eigenmac

A Zetamac-style eigenvalue drilling game. Solve eigenvalues of randomly generated matrices under a time limit. Includes a drawing notepad, bouncing DVD boxes, and a results screen with dynamic background.

## Features
- Timed eigenvalue drills with auto-check inputs
- Matrix sizes from 2×2 up to 5×5 (random within a chosen range)
- Integer-only eigenvalues, bounded entries
- Drawing pad for scratch work (draw anywhere)
- Animated bouncing image boxes + confetti
- Best score tracking and results backgrounds

## Customize
Edit constants at the top of `script.js`:
- Game defaults: `DEFAULT_TIME_LIMIT`, `DEFAULT_RANGE`, `DEFAULT_SIZE_MIN`, `DEFAULT_SIZE_MAX`, `DEFAULT_SYMMETRIC`
- DVD animation: `DVD_SPEED_X`, `DVD_SPEED_Y`, `DVD_WIDTH`, `DVD_HEIGHT`, `DVD_OPACITY`, `DVD_ACCEL_RATE`, `DVD_MAX_MULT`, `DVD_BOUNCE_MULT`, `CORNER_CHANCE`
- Spawn scaling: `DVD_SPEED_MIN`, `DVD_SPEED_MAX`, `DVD_SIZE_MIN`, `DVD_SIZE_MAX`

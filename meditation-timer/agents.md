# Project File Structure Summary

This document provides a high-level overview of the `meditation-timer` Angular project structure to provide context for AI agents efficiently.

## Root Configuration
- `angular.json`, `package.json`, `tsconfig*.json`: Core Angular workspace configuration and dependencies.
- `karma.conf.js`: Testing configuration.

## Public Assets (`/public`)
- `/public/manifest.webmanifest`, icons: PWA configuration and icons.
- `/public/img/`: Images (`buddha.jpg`, etc.).
- `/public/meditation/`: JSON configuration files for guided and text-based meditations.
- `/public/sounds/`: Audio files for timer bells and ambient noise.

## Source Code (`/src`)
- `main.ts`, `index.html`, `styles.scss`: Application entry points and global styling.

### Application Components (`/src/app`)
Organized by feature modules/standalone components:
- **Core Timer Features:**
  - `timer-container/`, `timer-setup/`, `timer-display/`, `end-time-display/`
  - `control-buttons/`, `volume-control/`
- **Meditation Modes:**
  - `guided-meditation/`
  - `guided-teacher-led-meditation/`
  - `readings/`
- **UI Elements & Dialogs:**
  - `header/`, `footer/`
  - `settings/`, `theme-toggle/`
  - `donate-dialog/`, `help-button/`, `install-dialog/`, `shortcuts-dialog/`

### Application Services (`/src/app`)
- **Timer & Audio:** `timer.service.ts`, `bell.service.ts`, `noise.service.ts`
- **Configuration & State:** `config.service.ts`, `settings.service.ts`, `timer-state.interface.ts`
- **Caching & Storage:** `meditation-cache.service.ts`, `image-storage.service.ts`
- **PWA Integration:** `install.service.ts`

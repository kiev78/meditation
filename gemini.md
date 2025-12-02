## 1. Project Overview
- **Name:** Meditation Timer SPA  
- **Framework:** Angular (latest stable, v21)  
- **Purpose:** Provide a customizable meditation timer with delay, duration, interval bells, and start/stop functionality.  
- **Architecture:** Single Page Application (SPA) with modular components and RxJS-based state management.  
Root folder is C:\dev\meditation\meditation-timer
---

## 2. Dependencies
- **Angular CLI**: `^21.x`  
- **RxJS**: `^7.8.2` (latest stable, required by Angular 21)  
- **Angular Material**: `^21.x` (for UI components)  
- **HTML5 Audio API** (for bell sounds)  
- **Wake Lock API** (to keep screen awake during meditation)  

---

## 3. Core Features
- **Timer Setup**
  - Configure meditation duration (default: 30:00).
  - Configure delay before start (default: 00:45).
  - Configure interval bells (0–3 bells).
- **Timer Controls**
  - Start, pause, reset functionality.
  - Keep screen awake during active timer.
- **Bell Sounds**
  - Play configurable bell sounds at intervals.
- **Theme**
  - Toggle between light and dark mode.
- **Persistence**
  - Save user preferences (duration, delay, bells, theme) in local storage.

---

## 4. Component Tree
```
app-root
 ├── header
 ├── timer-setup
 │     ├── bell-selector
 │     └── duration-delay-inputs
 ├── timer-display
 ├── control-buttons
 ├── theme-toggle
 └── settings
```

---

## 5. Services
- **TimerService**
  - Countdown logic, start/pause/reset.
  - Emits timer state via RxJS Observables.
- **BellService**
  - Manages audio playback for bells.
- **SettingsService**
  - Stores/retrieves preferences from local storage.
- **ScreenWakeService**
  - Uses Wake Lock API to keep screen awake.

---

## 6. State Management
- Use **RxJS BehaviorSubjects** for reactive state.  
- Global state includes:
  - `duration`
  - `delay`
  - `intervals`
  - `theme`
  - `isRunning`

---

## 7. Routing
- Minimal routing (SPA with one main view).  
- Optional: `/settings` route for advanced configuration.  

---

## 8. Acceptance Criteria
- User can configure and start a meditation timer.  
- Bells ring at configured intervals.  
- Timer continues even if screen is idle.  
- Preferences persist across sessions.  
- Dark/light mode toggle works globally.  

 
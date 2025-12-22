# Guided Teacher-Led Meditation Playback Specification

## Overview
When a user enables **Guided Mode** in the main app and selects a meditation duration, the system automatically selects and plays a teacher-led guided meditation that fits within the selected time.

---

## Meditation Selection Logic

### Input Parameters
- **Timer Duration**: Total time selected by user (in seconds)

### Selection Criteria
A meditation from `public/meditation/meditation-guided-files.json` is a **candidate** if:

```
startAudioDuration + 5 + endAudioDuration <=> timerDuration
```

Where:
- **5** = fixed 5min of silenece between before ending
- **startAudioDuration** = `start-url-duration` field (MM:SS format)
- **endAudioDuration** = `end-url-duration` field (MM:SS format, defaults to 0)

### Selection Behavior
1. Filter meditations by selection criteria
2. If candidates exist: **pick first** and use it
3. If no candidates: **fall back to TTS guided-meditation component** (existing text-to-speech) and use it.

### JSON Fields Used
```json
{
  "teacher": "string",
  "title": "string",
  "start-url": "/meditation/filename.mp3",
  "start-url-duration": "MM:SS",
  "end-url": "/meditation/filename.mp3",
  "end-url-duration": "MM:SS",
  "type": "string"
}
```

---

## Playback Timeline

### Timeline During a 35-minute Meditation  (30m start + 1m end)

```
Time (absolute) | Event                                    | Duration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0:00            | Bell 1 plays                             | 
0:00            | Bell 2 plays                             | 
0:00            | Bell 3 plays                             | 
0:00            | START meditation audio begins           | 30:00
30:00           | START audio ends, SILENCE begins        | 5:00
35:00           | END audio begins (1 minute before timer) | 1:00
36:00           | Timer reaches 0, END bell plays         | 
```

### Playback Rules

1. **Start Bell Sequence**
   - Play `startBells` count at intervals specified in `startBellIntervals`
   - First bell is immediate; subsequent bells wait the specified interval

2. **Start Audio** 
   - Play `start-url` audio file
   - Duration: `start-url-duration`

3. **Silence** (if needed)
   - If `timerDuration > startAudioDuration + 5m + endAudioDuration`:
     - Silence fills the gap so 
     - gap Length = `timerDuration - (startAudioDuration + endAudioDuration)`

4. **End Audio** (starts at: `timerDuration - silence - endAudioDuration`)
   - Play `end-url` audio file (if present)
   - Duration: `end-url-duration`
   - Must finish exactly when timer hits 0

5. **End Bell**
   - Plays immediately when timer reaches 0 (after end audio finishes)

---

## UI Controls & Slider Behavior

### Time Slider
- **Min**: 0 seconds
- **Max**: Full timer duration (e.g., 35 minutes = 2100 seconds)
- **Displays**: MM:SS format on both ends
- **Updates**: Every 100ms as timer runs
- **Reflects**: Total elapsed time across bells, audio, and silence

### Control Buttons
1. **Rewind 10s** (replay_10)
   - In timer mode: seeks back 10s in total timeline

2. **Play/Pause** (play_arrow / pause)
   - Toggles timer and audio state
   - Pauses bell sequences, audio, and scheduled events
   - disabled while no meditation loaded, enabled otherwise.

3. **Forward 10s** (forward_10)
   - In timer mode: seeks forward 10s in total timeline
   - Triggers `timerService.seek()`

4. **Next** ()
   - loads a next meditation from candidates matching time 
   - Resets slider to 0
   - if no more candidates, falls back to TTS guided meditation, and back to 1st candidate
if next pressed in TTS guided meditation.

### Seeking Behavior
When user drags slider or clicks seek:
1. Calculate new elapsed time from slider value
2. Call `timerService.seek(duration - elapsedTime)`
3. Cancel any scheduled audio playback
4. Reschedule audio based on new position (if applicable)

---

## State Management & Persistence

### Timer State Subscription
The component listens to `timerService.state$`:
- Updates `currentTime` to `duration - remainingTime`
- Updates `totalDuration` to full timer duration
- Only acts when `isGuided === true`
- Schedules audio playback on fresh start (when `remainingTime === duration`)

### LocalStorage Tracking
- **Key**: `lastGuidedMeditations`
- **Format**: Array of objects `{ title, teacher, when: ISO8601 }`
- **Capacity**: Keep last 20 meditations
- **Updated**: When a meditation is selected

### Cleanup
On component destroy:
- Cancel all scheduled timeouts
- Clear time update interval
- Stop audio playback
- Unsubscribe from timer state

---

## Edge Cases & Fallbacks

| Scenario | Behavior |
|----------|----------|
| No meditations in JSON | Fall back to TTS guided meditation |
| No candidates fit timer duration | Fall back to TTS guided meditation |
| User pauses meditation | All scheduled events cancel; slider stays at paused position |
| User seeks during audio playback | Audio stops; reschedule based on new timeline position |
| Audio metadata fails to load | `totalDuration` defaults to 0 |
| Audio playback errors | Set `isPlaying = false` and clear time update |

---

## Example JSON Entry

```json
{
  "teacher": "David Slaymaker",
  "title": "Body scan meditation",
  "start-url": "/meditation/12.15.25-DSlaymaker-18m-guided-meditation-start.mp3",
  "start-url-duration": "18:15",
  "end-url": "/meditation/12.15.25-DSlaymaker-25m-guided-meditation-end.mp3",
  "end-url-duration": "1:18",
  "type": "Body Scan"
}
```

This meditation:
- 18:15 of main content
- 1:18 of ending
- **Total needed**: 18:15 + 5 + 1:18 = 24:33 minimum
- Fits in any meditation duration ≥ 25 minutes

---

## Component Integration

### Parent: TimerContainerComponent
- Loads meditation JSON once on init
- Filters candidates per timer duration change
- Passes selected meditation to child via `[meditation]` input

### Child: GuidedTeacherLedMeditationComponent
- Receives meditation object from parent
- Subscribes to timer state for time tracking & scheduling
- Manages audio playback, UI state, and localStorage history
- Falls back to parent's fallback template if no meditation selected


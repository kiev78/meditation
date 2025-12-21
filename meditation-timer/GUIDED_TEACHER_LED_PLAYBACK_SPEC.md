# Guided Teacher-Led Meditation Playback Specification

## Overview
When a user enables **Guided Mode** in the main app and selects a meditation duration, the system automatically selects and plays a teacher-led guided meditation that fits within the selected time, accounting for bells and silence.

---

## Meditation Selection Logic

### Input Parameters
- **Timer Duration**: Total time selected by user (in seconds)
- **Start Bells**: Count of bells at meditation start (e.g., 3 bells)
- **Start Bell Intervals**: Delay between each bell (e.g., [5, 5] = 5s between each)
- **End Bells**: Count of bells at meditation end
- **End Bell Intervals**: Delay between end bells

### Selection Criteria
A meditation from `public/meditation/meditation-guided-files.json` is a **candidate** if:

```
startBellDuration + 3 + startAudioDuration + endAudioDuration <= timerDuration
```

Where:
- **startBellDuration** = sum of intervals between start bells (e.g., 2 bells with [5] interval = 5s total)
- **3** = fixed 3-second offset after last bell before audio starts
- **startAudioDuration** = `start-url-duration` field (MM:SS format)
- **endAudioDuration** = `end-url-duration` field (MM:SS format, defaults to 0)

### Selection Behavior
1. Filter meditations by selection criteria
2. If candidates exist: **pick one at random** and use it
3. If no candidates: **fall back to TTS guided-meditation component** (existing text-to-speech)

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

### Timeline During a 35-minute Meditation with 3 Bells, 5s Intervals, "Mindfulness of thoughts" (30m start + 1m end)

```
Time (absolute) | Event                                    | Duration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0:00            | Bell 1 plays                             | 
0:05            | Bell 2 plays                             | 
0:10            | Bell 3 plays                             | 
0:13            | START meditation audio begins           | 30:00
30:13           | START audio ends, SILENCE begins        | 4:47
35:00           | END audio begins (1 minute before timer) | 1:00
35:13           | Timer reaches 0, END bell plays         | 
```

### Playback Rules

1. **Start Bell Sequence**
   - Play `startBells` count at intervals specified in `startBellIntervals`
   - First bell is immediate; subsequent bells wait the specified interval

2. **Start Audio** (offset = bellDuration + 3 seconds)
   - Play `start-url` audio file
   - Duration: `start-url-duration`

3. **Silence** (if needed)
   - If `timerDuration > bellDuration + 3 + startAudioDuration + endAudioDuration`:
     - Silence fills the gap
     - Length = `timerDuration - (bellDuration + 3 + startAudioDuration + endAudioDuration)`

4. **End Audio** (starts at: `timerDuration - endAudioDuration`)
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
   - Triggers `timerService.seek()`

2. **Play/Pause** (play_arrow / pause)
   - Toggles timer and audio state
   - Pauses bell sequences, audio, and scheduled events

3. **Forward 10s** (forward_10)
   - In timer mode: seeks forward 10s in total timeline
   - Triggers `timerService.seek()`

4. **Random** (shuffle)
   - Selects a new random meditation from candidates
   - Resets slider to 0
   - **Auto-plays** immediately

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
- **Total needed**: 3s + 18:15 + 1:18 = ~19:36 minimum (before bells)
- Fits in any meditation duration ≥ ~25 minutes (accounting for typical bell sequences)

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


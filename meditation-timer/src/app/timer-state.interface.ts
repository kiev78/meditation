export interface TimerState {
  duration: number; // Total configured duration in seconds
  remainingTime: number; // Current countdown value in seconds
  delay: number; // Start delay in seconds
  intervals: number; // Interval bell frequency in minutes
  startBells: number; // Number of bells to ring at start
  startBellIntervals: number[]; // Seconds between start bells (array)
  endBells: number; // Number of bells to ring at end
  endBellIntervals: number[]; // Seconds between end bells (array)
  theme: 'light' | 'dark';
  isRunning: boolean;
  isWakeLockActive: boolean;
  backgroundImage?: string; 
  isGuided: boolean;
  readingPreferences?: string[];
}

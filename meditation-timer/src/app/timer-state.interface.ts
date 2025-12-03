export interface TimerState {
  duration: number; // Total configured duration in seconds
  remainingTime: number; // Current countdown value in seconds
  delay: number; // Start delay in seconds
  intervals: number; // Interval bell frequency in minutes
  startBells: number; // Number of bells to ring at start
  startBellInterval: number; // Seconds between start bells
  endBells: number; // Number of bells to ring at end
  endBellInterval: number; // Seconds between end bells
  theme: 'light' | 'dark';
  isRunning: boolean;
  backgroundImage?: string;
}

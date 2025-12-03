export interface TimerState {
  duration: number; // Total configured duration in seconds
  remainingTime: number; // Current countdown value in seconds
  delay: number; // Start delay in seconds
  intervals: number; // Interval bell frequency in minutes
  theme: 'light' | 'dark';
  isRunning: boolean;
  backgroundImage?: string;
}

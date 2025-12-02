export interface TimerState {
  duration: number; // in seconds
  delay: number; // in seconds
  intervals: number;
  theme: 'light' | 'dark';
  isRunning: boolean;
}

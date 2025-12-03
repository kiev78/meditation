import { Routes } from '@angular/router';
import { TimerContainerComponent } from './timer-container/timer-container.component';
import { ReadingsComponent } from './readings/readings.component';

export const routes: Routes = [
  { path: '', component: TimerContainerComponent },
  { path: 'readings', component: ReadingsComponent }
];

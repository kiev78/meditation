import { Routes } from '@angular/router';
import { TimerContainerComponent } from './timer-container/timer-container.component';
import { ReadingsComponent } from './readings/readings.component';
import { SettingsComponent } from './settings/settings.component';
import { DonateComponent } from './donate/donate.component';

export const routes: Routes = [
  { path: '', component: TimerContainerComponent },
  { path: 'timer', component: TimerContainerComponent },
  { path: 'readings', component: ReadingsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'donate', component: DonateComponent }
];

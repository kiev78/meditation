import { Routes } from '@angular/router';
import { TimerContainerComponent } from './timer-container/timer-container.component';
import { ReadingsComponent } from './readings/readings.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: '', component: TimerContainerComponent },
  { path: 'timer', component: TimerContainerComponent },
  { path: 'guided-teacher', loadComponent: () => import('./guided-teacher-led-meditation/guided-teacher-led-meditation.component').then(m => m.GuidedTeacherLedMeditationComponent) },
  { path: 'readings', component: ReadingsComponent },
  { path: 'settings', component: SettingsComponent }
];

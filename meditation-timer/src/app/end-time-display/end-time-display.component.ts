import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { TimerService } from '../timer.service';

@Component({
  selector: 'app-end-time-display',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatTooltipModule],
  templateUrl: './end-time-display.component.html',
  styleUrls: ['./end-time-display.component.css']
})
export class EndTimeDisplayComponent {
  @Input() endTime$: Observable<Date | null> | undefined;
  @Input() currentTime$: Observable<Date> | undefined;
  @Input() timerService: TimerService | undefined;
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-readings',
  standalone: true,
  template: `
    <div class="readings-container">
      <h2>Inspirational Readings</h2>
      <div class="content" contenteditable="true">
        <!-- Placeholder for HTML content -->
        <p>Paste your inspirational HTML content here...</p>
        <blockquote>
          "The quieter you become, the more you can hear."
        </blockquote>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
         <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
         <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
         <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .readings-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .content {
      border: 1px dashed #ccc;
      padding: 1rem;
      min-height: 200px;
    }
  `]
})
export class ReadingsComponent {}

import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** An error banner announced to screen readers. Projects the text and any action button. */
@Component({
  selector: 'app-error-message',
  imports: [MatIcon],
  template: `
    <mat-icon aria-hidden="true">error</mat-icon>
    <div class="flex flex-1 flex-wrap items-center gap-x-2"><ng-content /></div>
  `,
  host: {
    role: 'alert',
    class:
      'flex items-center gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container',
  },
})
export class ErrorMessage {}

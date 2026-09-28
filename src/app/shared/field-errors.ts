import { Component, computed, input } from '@angular/core';

/** The subset of a Signal Forms `FieldState` this component reads. */
interface FieldStateLike {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { message?: string }[];
}

/**
 * Shows the first validation error of a field once it has been touched.
 * Give it an `id` and reference it from the input's `aria-describedby`.
 */
@Component({
  selector: 'app-field-errors',
  template: `
    @if (message(); as message) {
      <small class="text-red-700">{{ message }}</small>
    }
  `,
  host: { 'aria-live': 'polite', class: 'block' },
})
export class FieldErrors {
  readonly state = input.required<FieldStateLike>();

  protected readonly message = computed(() => {
    const state = this.state();
    return state.touched() && state.invalid() ? state.errors()[0]?.message : undefined;
  });
}

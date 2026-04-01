import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'gom-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-textarea.component.html',
  styleUrl: './gom-textarea.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GomTextareaComponent),
      multi: true,
    },
  ],
})
export class GomTextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 4;
  @Input() hint = '';
  @Input() error = '';
  @Input() id = `gom-textarea-${Math.random().toString(36).slice(2, 9)}`;

  @Output() valueChange = new EventEmitter<string>();

  value = '';
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  handleInput(event: Event): void {
    const nextValue = (event.target as HTMLTextAreaElement).value;
    this.value = nextValue;
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
  }

  handleBlur(): void {
    this.onTouched();
  }
}

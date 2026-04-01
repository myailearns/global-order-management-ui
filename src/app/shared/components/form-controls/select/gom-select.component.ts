import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface GomSelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'gom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-select.component.html',
  styleUrl: './gom-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GomSelectComponent),
      multi: true,
    },
  ],
})
export class GomSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() options: GomSelectOption[] = [];
  @Input() hint = '';
  @Input() error = '';
  @Input() id = `gom-select-${Math.random().toString(36).slice(2, 9)}`;

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

  handleChange(event: Event): void {
    const nextValue = (event.target as HTMLSelectElement).value;
    this.value = nextValue;
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
  }

  handleBlur(): void {
    this.onTouched();
  }
}

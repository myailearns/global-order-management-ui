import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'gom-lib-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-checkbox.component.html',
  styleUrl: './gom-checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GomCheckboxComponent),
      multi: true,
    },
  ],
})
export class GomCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() id = `gom-checkbox-${Math.random().toString(36).slice(2, 9)}`;

  @Output() checkedChange = new EventEmitter<boolean>();

  checked = false;
  disabled = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean | null): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  handleChange(event: Event): void {
    const nextValue = (event.target as HTMLInputElement).checked;
    this.checked = nextValue;
    this.onChange(nextValue);
    this.checkedChange.emit(nextValue);
  }

  handleBlur(): void {
    this.onTouched();
  }
}

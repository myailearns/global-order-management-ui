import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface GomSelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'gom-lib-select',
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
export class GomSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = 'Select an option';
  @Input() options: GomSelectOption[] = [];
  @Input() isDisabled = false;
  @Input() hint = '';
  @Input() error = '';
  @Input() id = `gom-select-${Math.random().toString(36).slice(2, 9)}`;
  @Input() multiple = false;
  @Input() selectedValues: string[] = [];
  @Input() searchable = false;
  @Input() searchPlaceholder = 'Search...';
  @Input() closeMenuTrigger: unknown;

  @Output() valueChange = new EventEmitter<string>();
  @Output() selectedValuesChange = new EventEmitter<string[]>();

  private readonly el = inject(ElementRef<HTMLElement>);

  value = '';
  disabled = false;
  menuOpen = false;
  menuOpenUpward = false;
  searchTerm = '';
  menuStyles: Record<string, string> = {};

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['closeMenuTrigger'] && !changes['closeMenuTrigger'].firstChange) {
      this.closeMenu();
    }
  }

  get displayLabel(): string {
    if (this.multiple) {
      if (!this.selectedValues.length) {
        return this.placeholder;
      }

      const selectedLabels = this.options
        .filter((option) => this.selectedValues.includes(option.value))
        .map((option) => option.label);

      if (!selectedLabels.length) {
        return this.placeholder;
      }

      if (selectedLabels.length <= 2) {
        return selectedLabels.join(', ');
      }

      return `${selectedLabels[0]}, +${selectedLabels.length - 1}`;
    }

    const selected = this.options.find((option) => option.value === this.value);
    return selected?.label || this.placeholder;
  }

  get filteredOptions(): GomSelectOption[] {
    if (!this.searchable) {
      return this.options;
    }

    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.options;
    }

    return this.options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    );
  }

  writeValue(value: string | string[] | null): void {
    if (this.multiple) {
      this.selectedValues = Array.isArray(value) ? value : [];
      return;
    }

    this.value = typeof value === 'string' ? value : '';
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  toggleMenu(): void {
    if (this.disabled || this.isDisabled) {
      return;
    }

    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      if (this.searchable) {
        this.searchTerm = '';
      }
      // Compute synchronously first so menu renders at correct position (no flash at top:0).
      this.computeMenuPosition();
      // Re-compute after render to get accurate menu offsetHeight for maxHeight capping.
      requestAnimationFrame(() => this.computeMenuPosition());
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchTerm = target?.value || '';
  }

  selectOption(value: string): void {
    if (this.disabled || this.isDisabled) {
      return;
    }

    if (this.multiple) {
      const next = new Set(this.selectedValues);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }

      this.selectedValues = [...next];
      this.selectedValuesChange.emit(this.selectedValues);
      this.onChange([...this.selectedValues]);
      return;
    }

    this.value = value;
    this.valueChange.emit(value);
    this.onChange(value);
    this.menuOpen = false;
    this.onTouched();
  }

  isSelected(optionValue: string): boolean {
    return this.multiple
      ? this.selectedValues.includes(optionValue)
      : this.value === optionValue;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.el.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.menuOpen) {
      return;
    }

    this.updateMenuDirection();
  }

  @HostListener('window:scroll')
  @HostListener('document:scroll')
  onViewportScroll(): void {
    if (!this.menuOpen) {
      return;
    }

    this.updateMenuDirection();
  }

  private updateMenuDirection(): void {
    requestAnimationFrame(() => this.computeMenuPosition());
  }

  private computeMenuPosition(): void {
    if (!this.menuOpen) {
      return;
    }

    const wrapper = this.el.nativeElement.querySelector('.gom-control__select-wrapper') as HTMLElement | null;
    const menu = this.el.nativeElement.querySelector('.gom-control__menu') as HTMLElement | null;

    if (!wrapper) {
      this.menuOpenUpward = false;
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight || 224;
    const safeGap = 12;
    const menuGap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - safeGap;
    const spaceAbove = rect.top - safeGap;

    // Prefer opening downward. Flip upward only when below space is too tight.
    const minimumMenuHeight = 120;
    this.menuOpenUpward = spaceBelow < minimumMenuHeight && spaceAbove > spaceBelow;

    const maxHeight = Math.max(120, Math.floor(this.menuOpenUpward ? spaceAbove : spaceBelow));
    const preferredHeight = Math.min(menuHeight, maxHeight);
    const rawTop = this.menuOpenUpward
      ? rect.top - preferredHeight - menuGap
      : rect.bottom + menuGap;

    const availableWidth = Math.max(160, Math.floor(window.innerWidth - rect.left - safeGap));
    const width = Math.min(Math.floor(rect.width), availableWidth);

    this.menuStyles = {
      position: 'fixed',
      top: `${Math.max(safeGap, Math.round(rawTop))}px`,
      left: `${Math.max(safeGap, Math.round(rect.left))}px`,
      width: `${Math.round(width)}px`,
      maxHeight: `${Math.round(maxHeight)}px`,
    };
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menuOpenUpward = false;
    this.menuStyles = {};
    if (this.searchable) {
      this.searchTerm = '';
    }
    this.onTouched();
  }
}

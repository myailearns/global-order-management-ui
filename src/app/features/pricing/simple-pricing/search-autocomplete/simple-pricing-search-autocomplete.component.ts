import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

import { FormControlsModule } from '@gomlibs/ui';

import {
  SimplePricingSearchSuggestion,
  SimplePricingService,
} from '../simple-pricing.service';

export type { SimplePricingSearchSuggestion };

@Component({
  selector: 'gom-simple-pricing-search-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule],
  templateUrl: './simple-pricing-search-autocomplete.component.html',
  styleUrls: ['./simple-pricing-search-autocomplete.component.scss'],
})
export class SimplePricingSearchAutocompleteComponent implements OnInit, OnDestroy {
  private readonly service = inject(SimplePricingService);
  private readonly elRef = inject(ElementRef);
  private readonly subscription = new Subscription();
  private resetKeyValue = 0;

  @Input()
  set resetKey(value: number) {
    const normalized = Number(value || 0);
    if (normalized === this.resetKeyValue) {
      return;
    }
    this.resetKeyValue = normalized;
    this.resetSelectionState();
  }

  @Output() suggestionSelected = new EventEmitter<SimplePricingSearchSuggestion>();
  @Output() cleared = new EventEmitter<void>();

  readonly inputControl = new FormControl<string>('', { nonNullable: true });

  readonly suggestions = signal<SimplePricingSearchSuggestion[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);

  /** The currently committed selection (shown as a chip) */
  readonly selectedSuggestion = signal<SimplePricingSearchSuggestion | null>(null);

  ngOnInit(): void {
    const sub = this.inputControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        const trimmed = (term || '').trim();
        if (!trimmed || this.selectedSuggestion()) {
          this.suggestions.set([]);
          this.open.set(false);
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
          return this.service.searchEntities(trimmed, 20).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe((result) => {
      this.loading.set(false);
      if (result?.data?.length) {
        this.suggestions.set(result.data);
        this.open.set(true);
      } else {
        this.suggestions.set([]);
        this.open.set(false);
      }
    });

    this.subscription.add(sub);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  select(suggestion: SimplePricingSearchSuggestion): void {
    this.selectedSuggestion.set(suggestion);
    this.inputControl.setValue('', { emitEvent: false });
    this.suggestions.set([]);
    this.open.set(false);
    this.suggestionSelected.emit(suggestion);
  }

  clearSelection(): void {
    this.resetSelectionState();
    this.cleared.emit();
  }

  private resetSelectionState(): void {
    this.selectedSuggestion.set(null);
    this.suggestions.set([]);
    this.open.set(false);
    this.loading.set(false);
    this.inputControl.setValue('', { emitEvent: false });
  }

  groupTypeLabel(groupType: string): string {
    const map: Record<string, string> = {
      MEASURED: 'Measured',
      HYBRID: 'Hybrid',
      ATTRIBUTE: 'Attribute',
    };
    return map[groupType] ?? groupType;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}

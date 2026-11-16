import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, Subject, catchError, switchMap, tap } from 'rxjs';
import { GomCheckboxComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { MediaPurpose } from '../media-prepare/media-purpose.config';
import { AttachOption, AttachTarget } from './media-attach.models';
import { MediaAttachService } from './media-attach.service';

/**
 * Optional "attach after upload" selector. Product purpose lists groups with their variants,
 * category and pack purposes list a single item. Options are loaded once and searched inside the select.
 */
@Component({
  selector: 'gom-media-attach-target',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomCheckboxComponent, GomSelectComponent],
  templateUrl: './media-attach-target.component.html',
  styleUrl: './media-attach-target.component.scss',
})
export class MediaAttachTargetComponent {
  readonly purpose = input.required<MediaPurpose>();
  readonly disabled = input<boolean>(false);
  readonly targetsChange = output<AttachTarget[]>();

  private readonly attachService = inject(MediaAttachService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly enabledControl = new FormControl(false, { nonNullable: true });
  readonly galleryControl = new FormControl(true, { nonNullable: true });
  readonly targetControl = new FormControl('', { nonNullable: true });

  readonly enabled = toSignal(this.enabledControl.valueChanges, { initialValue: false });
  readonly includeGallery = toSignal(this.galleryControl.valueChanges, { initialValue: true });

  readonly options = signal<AttachOption[]>([]);
  readonly variantOptions = signal<AttachOption[]>([]);
  readonly selectedVariantIds = signal<string[]>([]);
  readonly selectedOption = signal<AttachOption | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly permissions = computed(() => this.attachService.permissions());
  readonly allowed = computed(() => this.attachService.canAttach(this.purpose()));
  readonly entityLabel = computed(() => this.translate.instant(`media.attach.entities.${this.purpose()}`));

  readonly selectOptions = computed<GomSelectOption[]>(() => {
    const list = [...this.options()];
    const selected = this.selectedOption();
    if (selected && !list.some((option) => option.value === selected.value)) {
      list.unshift(selected);
    }
    return list.map((option) => ({ value: option.value, label: option.label }));
  });
  readonly variantSelectOptions = computed<GomSelectOption[]>(() =>
    this.variantOptions().map((option) => ({ value: option.value, label: option.label })),
  );

  readonly targets = computed<AttachTarget[]>(() => {
    const selected = this.selectedOption();
    if (!this.enabled() || !this.allowed() || !selected) {
      return [];
    }

    switch (this.purpose()) {
      case 'CATEGORY':
        return [{ kind: 'CATEGORY', id: selected.value, name: selected.label }];
      case 'PACK':
        return [{ kind: 'PACK', id: selected.value, name: selected.label, images: selected.images ?? [] }];
      case 'PRODUCT': {
        const permissions = this.permissions();
        const targets: AttachTarget[] = [];
        if (permissions.group && this.includeGallery()) {
          targets.push({ kind: 'GROUP', id: selected.value, name: selected.label });
        }
        if (permissions.variant) {
          const chosen = new Set(this.selectedVariantIds());
          for (const variant of this.variantOptions()) {
            if (chosen.has(variant.value)) {
              targets.push({ kind: 'VARIANT', id: variant.value, name: `${selected.label} - ${variant.label}` });
            }
          }
        }
        return targets;
      }
    }
  });

  private readonly load$ = new Subject<void>();

  constructor() {
    this.load$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap(() =>
          this.requestOptions().pipe(
            catchError(() => {
              this.loadError.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((options) => {
        this.options.set(options);
        this.loading.set(false);
      });

    this.targetControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => this.onTargetChange(id));

    effect(() => {
      this.purpose();
      const enabled = this.enabled();
      untracked(() => {
        this.resetSelection();
        if (enabled) {
          this.load$.next();
        }
      });
    });

    effect(() => this.targetsChange.emit(this.targets()));

    effect(() => {
      const locked = this.disabled();
      const controls = [this.galleryControl, this.targetControl];
      if (locked || !this.allowed()) {
        this.enabledControl.disable({ emitEvent: false });
      } else {
        this.enabledControl.enable({ emitEvent: false });
      }
      for (const control of controls) {
        if (locked) {
          control.disable({ emitEvent: false });
        } else {
          control.enable({ emitEvent: false });
        }
      }
    });
  }

  onVariantsChange(ids: string[]): void {
    this.selectedVariantIds.set(ids);
  }

  private onTargetChange(id: string): void {
    this.selectedOption.set(id ? (this.options().find((option) => option.value === id) ?? this.selectedOption()) : null);
    this.variantOptions.set([]);
    this.selectedVariantIds.set([]);

    if (this.purpose() === 'PRODUCT' && id && this.permissions().variant) {
      this.attachService
        .listVariants(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (variants) => this.variantOptions.set(variants),
          error: () => this.loadError.set(true),
        });
    }
  }

  private resetSelection(): void {
    this.options.set([]);
    this.variantOptions.set([]);
    this.selectedVariantIds.set([]);
    this.selectedOption.set(null);
    this.targetControl.setValue('', { emitEvent: false });
    this.galleryControl.setValue(this.permissions().group, { emitEvent: true });
  }

  private requestOptions(): Observable<AttachOption[]> {
    switch (this.purpose()) {
      case 'PRODUCT':
        return this.attachService.searchGroups('');
      case 'CATEGORY':
        return this.attachService.searchCategories('');
      case 'PACK':
        return this.attachService.searchPacks('');
    }
  }
}

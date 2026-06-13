import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
} from '@gomlibs/ui';
import {
  TemplateCatalogService,
  BusinessTemplate,
  BusinessTemplatePreview,
  TemplateCategory,
} from '../templates/template-catalog.service';

@Component({
  selector: 'gom-business-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './business-templates.component.html',
  styleUrl: './business-templates.component.scss',
})
export class BusinessTemplatesComponent implements OnInit {
  private readonly catalogService = inject(TemplateCatalogService);
  private readonly toast = inject(GomAlertToastService);

  readonly loading = signal(false);
  readonly templates = signal<BusinessTemplate[]>([]);
  readonly categories = signal<TemplateCategory[]>([]);

  // Form modal
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly formName = signal('');
  readonly formCode = signal('');
  readonly formDescription = signal('');
  readonly formIcon = signal('ri-store-2-line');
  readonly formCategoryIds = signal<string[]>([]);
  readonly isEditing = computed(() => this.editingId() !== null);

  // Preview modal
  readonly previewOpen = signal(false);
  readonly previewLoading = signal(false);
  readonly previewData = signal<BusinessTemplatePreview | null>(null);

  // Delete
  readonly deleteConfirmOpen = signal(false);
  readonly deletingTemplate = signal<BusinessTemplate | null>(null);

  readonly iconOptions = [
    'ri-store-2-line', 'ri-shopping-basket-line', 'ri-restaurant-line',
    'ri-tools-line', 'ri-truck-line', 'ri-capsule-line',
    'ri-cake-2-line', 'ri-drop-line', 'ri-shopping-bag-line',
    'ri-calendar-check-line', 'ri-service-line', 'ri-box-3-line',
  ];

  ngOnInit(): void {
    this.loadTemplates();
    this.loadCategories();
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.catalogService.listBusinessTemplates().subscribe({
      next: (res) => {
        this.templates.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load business templates');
        this.loading.set(false);
      },
    });
  }

  loadCategories(): void {
    this.catalogService.listCategories().subscribe({
      next: (res) => this.categories.set(res.data ?? []),
      error: () => {},
    });
  }

  // --- Form ---
  openCreate(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formCode.set('');
    this.formDescription.set('');
    this.formIcon.set('ri-store-2-line');
    this.formCategoryIds.set([]);
    this.formOpen.set(true);
  }

  openEdit(bt: BusinessTemplate): void {
    this.editingId.set(bt._id);
    this.formName.set(bt.name);
    this.formCode.set(bt.code);
    this.formDescription.set(bt.description);
    this.formIcon.set(bt.icon);
    this.formCategoryIds.set(bt.categoryIds.map((c) => c._id));
    this.formOpen.set(true);
  }

  onNameChange(value: string): void {
    this.formName.set(value);
    if (!this.isEditing()) {
      this.formCode.set(value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }
  }

  toggleCategory(id: string): void {
    const current = this.formCategoryIds();
    if (current.includes(id)) {
      this.formCategoryIds.set(current.filter((c) => c !== id));
    } else {
      this.formCategoryIds.set([...current, id]);
    }
  }

  isCategorySelected(id: string): boolean {
    return this.formCategoryIds().includes(id);
  }

  selectIcon(icon: string): void {
    this.formIcon.set(icon);
  }

  saveTemplate(): void {
    const name = this.formName().trim();
    const code = this.formCode().trim();
    if (!name || !code) {
      this.toast.error('Name and code are required');
      return;
    }

    const payload = {
      name,
      code,
      description: this.formDescription().trim(),
      icon: this.formIcon(),
      categoryIds: this.formCategoryIds(),
    };

    this.loading.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.catalogService.updateBusinessTemplate(id, payload)
      : this.catalogService.createBusinessTemplate(payload);

    req$.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.toast.success(id ? 'Business template updated' : 'Business template created');
        this.loadTemplates();
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to save business template');
        this.loading.set(false);
      },
    });
  }

  cancelForm(): void {
    this.formOpen.set(false);
  }

  // --- Preview ---
  openPreview(bt: BusinessTemplate): void {
    this.previewData.set(null);
    this.previewLoading.set(true);
    this.previewOpen.set(true);

    this.catalogService.getBusinessTemplatePreview(bt._id).subscribe({
      next: (res) => {
        this.previewData.set(res.data);
        this.previewLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load preview');
        this.previewLoading.set(false);
        this.previewOpen.set(false);
      },
    });
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  // --- Delete ---
  confirmDelete(bt: BusinessTemplate): void {
    this.deletingTemplate.set(bt);
    this.deleteConfirmOpen.set(true);
  }

  executeDelete(): void {
    const bt = this.deletingTemplate();
    if (!bt) return;

    this.catalogService.deleteBusinessTemplate(bt._id).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.deletingTemplate.set(null);
        this.toast.success('Business template deleted');
        this.loadTemplates();
      },
      error: () => {
        this.toast.error('Failed to delete');
        this.deleteConfirmOpen.set(false);
      },
    });
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingTemplate.set(null);
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import {
  FormControlsModule,
  GomAccordionComponent,
  GomAlertToastService,
  GomButtonComponent,
  GomCardComponent,
  GomInputComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTextareaComponent,
} from '@gomlibs/ui';

import { BillPreviewComponent } from './bill-preview.component';
import {
  BillAlignment,
  BillFontSize,
  BillOrderType,
  BillPageSize,
  BillTemplate,
  BillTemplateAssignment,
} from './billing-template.models';
import { BillingTemplateService } from './billing-template.service';

@Component({
  selector: 'gom-billing-settings',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    FormControlsModule,
    GomAccordionComponent,
    GomButtonComponent,
    GomCardComponent,
    GomInputComponent,
    GomSelectComponent,
    GomTextareaComponent,
    BillPreviewComponent,
  ],
  templateUrl: './billing-settings.component.html',
  styleUrl: './billing-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingSettingsComponent implements OnInit {
  private readonly service = inject(BillingTemplateService);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly view = signal<BillingView>('templates');
  readonly templates = signal<BillTemplate[]>([]);
  readonly assignments = signal<BillTemplateAssignment[]>([]);
  readonly assignmentDraft = signal<Record<BillOrderType, string>>({ IN_STORE: '', PICKUP: '', DELIVERY: '' });
  readonly assignmentBaseline = signal('');
  readonly loading = signal(true);
  readonly initializing = signal(false);
  readonly saving = signal(false);
  readonly busyTemplateId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly editorTemplate = signal<BillTemplate | null>(null);
  readonly editorDraft = signal<BillTemplate | null>(null);
  readonly editorReturnView = signal<'templates' | 'assignments'>('templates');
  readonly expandedSections = signal<Record<string, boolean>>({});

  readonly orderTypes: BillOrderType[] = ['IN_STORE', 'PICKUP', 'DELIVERY'];
  readonly pageSizeOptions: GomSelectOption[] = [
    { value: 'THERMAL_80', label: 'Thermal 80 mm' },
    { value: 'A4', label: 'A4' },
  ];
  readonly fontSizeOptions: GomSelectOption[] = [
    { value: 'SMALL', label: 'Small' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LARGE', label: 'Large' },
  ];
  readonly alignmentOptions: GomSelectOption[] = [
    { value: 'LEFT', label: 'Left' },
    { value: 'CENTER', label: 'Center' },
    { value: 'RIGHT', label: 'Right' },
  ];
  readonly accentColors = ['#0a5d8b', '#5046e5', '#00856a', '#f59e0b', '#b42318', '#344054'];
  readonly templateOptions = computed<GomSelectOption[]>(() => this.templates()
    .filter((template) => template.isActive)
    .map((template) => ({ value: template.id, label: template.name })));
  readonly assignmentsDirty = computed(() => JSON.stringify(this.assignmentDraft()) !== this.assignmentBaseline());

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.listTemplates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.templates.set(response.data.templates || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to load bill templates.'));
      },
    });
  }

  initializeTemplates(): void {
    if (this.initializing()) return;
    this.initializing.set(true);
    this.errorMessage.set(null);
    this.service.initializeTemplates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.templates.set(response.data.templates || []);
        this.initializing.set(false);
        this.toast.success('Default bill templates created.');
      },
      error: (error) => {
        this.initializing.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to create default bill templates.'));
      },
    });
  }

  useTemplate(template: BillTemplate): void {
    if (this.busyTemplateId()) return;
    this.busyTemplateId.set(template.id);
    this.service.useTemplate(template.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.templates.update((templates) => templates.map((item) => ({
          ...item,
          isDefault: item.id === response.data.id,
        })));
        this.busyTemplateId.set(null);
        this.toast.success(`${response.data.name} is now the default bill template.`);
      },
      error: (error) => {
        this.busyTemplateId.set(null);
        this.toast.error(this.apiMessage(error, 'Unable to select the bill template.'));
      },
    });
  }

  openEditor(template: BillTemplate): void {
    this.editorReturnView.set(this.view() === 'assignments' ? 'assignments' : 'templates');
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getTemplate(template.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const source = this.clone(response.data);
        this.editorTemplate.set(source);
        this.editorDraft.set(this.clone(source));
        this.expandedSections.set(Object.fromEntries(source.configuration.sections.map((section, index) => [section.id, index === 0])));
        this.view.set('editor');
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to load the bill template.'));
      },
    });
  }

  closeEditor(): void {
    this.editorTemplate.set(null);
    this.editorDraft.set(null);
    this.view.set(this.editorReturnView());
    this.errorMessage.set(null);
  }

  updateTemplateText(property: 'name' | 'description', value: string): void {
    this.updateDraft((draft) => {
      draft[property] = value;
      if (property === 'name') draft.configuration.templateName = value;
    });
  }

  updatePageSize(value: string): void {
    this.updateDraft((draft) => { draft.configuration.page.size = value as BillPageSize; });
  }

  updateFontSize(value: string): void {
    this.updateDraft((draft) => { draft.configuration.formatting.fontSize = value as BillFontSize; });
  }

  updateLogoPosition(value: string): void {
    this.updateDraft((draft) => { draft.configuration.formatting.logoPosition = value as BillAlignment; });
  }

  updateCompactSpacing(value: boolean): void {
    this.updateDraft((draft) => { draft.configuration.formatting.compactSpacing = value; });
  }

  updateAccentColor(value: string): void {
    this.updateDraft((draft) => { draft.configuration.formatting.accentColor = value; });
  }

  updateFooter(property: 'thankYouMessage' | 'notes' | 'returnPolicy', value: string): void {
    this.updateDraft((draft) => { draft.configuration.footer[property] = value; });
  }

  updateSectionVisibility(sectionId: string, visible: boolean): void {
    this.updateDraft((draft) => {
      const section = draft.configuration.sections.find((item) => item.id === sectionId);
      if (section) section.visible = visible;
    });
  }

  updateFieldVisibility(sectionId: string, fieldId: string, visible: boolean): void {
    this.updateDraft((draft) => {
      const field = draft.configuration.sections.find((item) => item.id === sectionId)?.fields.find((item) => item.id === fieldId);
      if (field && !field.locked) field.visible = visible;
    });
  }

  updateFieldLabel(sectionId: string, fieldId: string, label: string): void {
    this.updateDraft((draft) => {
      const field = draft.configuration.sections.find((item) => item.id === sectionId)?.fields.find((item) => item.id === fieldId);
      if (field) field.label = label;
    });
  }

  moveSection(sectionId: string, direction: -1 | 1): void {
    this.updateDraft((draft) => {
      const sections = draft.configuration.sections;
      const currentIndex = sections.findIndex((section) => section.id === sectionId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
      [sections[currentIndex], sections[targetIndex]] = [sections[targetIndex], sections[currentIndex]];
      sections.forEach((section, index) => { section.order = index + 1; });
    });
  }

  toggleSection(sectionId: string, expanded: boolean): void {
    this.expandedSections.update((current) => ({ ...current, [sectionId]: expanded }));
  }

  saveTemplate(): void {
    const draft = this.editorDraft();
    if (!draft || this.saving()) return;
    if (!draft.name.trim()) {
      this.errorMessage.set('Template name is required.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.service.updateTemplate(draft.id, {
      name: draft.name.trim(),
      description: draft.description.trim(),
      expectedVersion: draft.version,
      configuration: draft.configuration,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.templates.update((templates) => templates.map((item) => item.id === response.data.id ? response.data : item));
        this.editorTemplate.set(this.clone(response.data));
        this.editorDraft.set(this.clone(response.data));
        this.saving.set(false);
        this.toast.success('Bill template saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to save the bill template.'));
      },
    });
  }

  openAssignments(): void {
    this.view.set('assignments');
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.listAssignments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const assignments = response.data.assignments || [];
        this.assignments.set(assignments);
        const draft = this.buildAssignmentDraft(assignments);
        this.assignmentDraft.set(draft);
        this.assignmentBaseline.set(JSON.stringify(draft));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to load template assignments.'));
      },
    });
  }

  updateAssignment(orderType: BillOrderType, templateId: string): void {
    this.assignmentDraft.update((current) => ({ ...current, [orderType]: templateId }));
  }

  editAssignedTemplate(orderType: BillOrderType): void {
    const templateId = this.assignmentDraft()[orderType];
    const template = this.templates().find((item) => item.id === templateId);
    if (template) this.openEditor(template);
  }

  saveAssignments(): void {
    if (this.saving() || !this.assignmentsDirty()) return;
    const draft = this.assignmentDraft();
    if (this.orderTypes.some((orderType) => !draft[orderType])) {
      this.errorMessage.set('Select a bill template for every order type.');
      return;
    }
    const payload = this.orderTypes.map((orderType) => ({ orderType, templateId: draft[orderType] }));
    this.saving.set(true);
    this.errorMessage.set(null);
    this.service.updateAssignments(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.assignments.set(response.data.assignments || []);
        const saved = this.buildAssignmentDraft(response.data.assignments || []);
        this.assignmentDraft.set(saved);
        this.assignmentBaseline.set(JSON.stringify(saved));
        this.saving.set(false);
        this.toast.success('Bill template assignments saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to save template assignments.'));
      },
    });
  }

  backToTemplates(): void {
    this.view.set('templates');
    this.errorMessage.set(null);
  }

  orderTypeLabel(orderType: BillOrderType): string {
    return ({ IN_STORE: 'In-store orders', PICKUP: 'Pickup orders', DELIVERY: 'Delivery orders' })[orderType];
  }

  private updateDraft(update: (draft: BillTemplate) => void): void {
    const current = this.editorDraft();
    if (!current) return;
    const next = this.clone(current);
    update(next);
    this.editorDraft.set(next);
  }

  private buildAssignmentDraft(assignments: BillTemplateAssignment[]): Record<BillOrderType, string> {
    const byType = new Map(assignments.map((assignment) => [assignment.orderType, assignment.templateId]));
    const simple = this.templates().find((template) => template.code === 'SIMPLE_BILL')?.id || this.templates()[0]?.id || '';
    const delivery = this.templates().find((template) => template.code === 'DELIVERY_BILL')?.id || simple;
    return {
      IN_STORE: byType.get('IN_STORE') || simple,
      PICKUP: byType.get('PICKUP') || simple,
      DELIVERY: byType.get('DELIVERY') || delivery,
    };
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private apiMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string } };
    return String(candidate?.error?.message || fallback);
  }
}

type BillingView = 'templates' | 'editor' | 'assignments';

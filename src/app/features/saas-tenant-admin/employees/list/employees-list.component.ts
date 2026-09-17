import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomChipComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';

import { TenantAccessService } from '../../services';
import { EmployeeProfile } from '../../models';
import { TRANSLATION_KEYS, UI_CONFIG } from '../../constants';
import { EmployeeFormComponent } from '../form/employee-form.component';
import { DisableIfNoFeatureDirective } from '../../../../shared/directives/disable-if-no-feature.directive';

interface EmployeeRow extends GomTableRow {
  employeeId: string;
  name: string;
  email: string;
  status: string;
}

/**
 * EPIC 3 UI - S8: Employees Management List Component
 */
@Component({
  selector: 'gom-employees-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomChipComponent,
    GomTableComponent,
    GomModalComponent,
    EmployeeFormComponent,
  ],
  templateUrl: './employees-list.component.html',
  styleUrl: './employees-list.component.scss',
})
export class EmployeesListComponent implements OnInit {
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly errorMessage = signal<string | null>(null);

  readonly employees = signal<EmployeeProfile[]>([]);
  readonly page = signal(1);
  readonly limit = signal(UI_CONFIG.EMPLOYEES_PAGE_SIZE);
  readonly total = signal(0);
  readonly formModalOpen = signal(false);
  readonly editingEmployeeId = signal<string | null>(null);

  readonly maxEmployees = signal<number | null>(null);
  readonly deleteConfirmModalOpen = signal(false);
  readonly deletingEmployeeId = signal<string | null>(null);
  readonly employeeToDelete = signal<string>('');
  readonly atQuota = computed(() => {
    const max = this.maxEmployees();
    return max !== null && this.total() >= max;
  });
  readonly quotaLabel = computed(() => {
    const max = this.maxEmployees();
    if (max === null) return null;
    return `${this.total()} / ${max}`;
  });

  readonly filteredEmployees = computed<EmployeeRow[]>(() => {
    return this.employees()
      .map((emp) => ({
        employeeId: emp._id,
        name: emp.fullName,
        email: typeof emp.userId === 'string' ? '-' : (emp.userId?.email || '-'),
        status: emp.status,
      }));
  });

  readonly columns = computed<GomTableColumn<EmployeeRow>[]>(() => {
    const baseColumns: GomTableColumn<EmployeeRow>[] = [
      { key: 'name', header: this.translate.instant(TRANSLATION_KEYS.TBL_EMPLOYEE_NAME), sortable: true, width: '15rem' },
      { key: 'email', header: this.translate.instant('saas.admin.employees.tbl_email'), sortable: true, width: '18rem' },
      { key: 'status', header: this.translate.instant('saas.admin.employees.lbl_status'), width: '10rem' },
    ];

    if (!this.canWrite()) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        header: this.translate.instant('common.labels.actions'),
        width: '8rem',
        actionButtons: [
          { label: this.translate.instant('common.actions.edit'), actionKey: 'edit', variant: 'secondary', icon: 'ri-pencil-line' },
          { label: this.translate.instant('common.actions.delete'), actionKey: 'delete', variant: 'danger', icon: 'ri-delete-bin-line' },
        ],
      },
    ];
  });

  readonly translationKeys = TRANSLATION_KEYS;

  ngOnInit(): void {
    this.loadEmployees();
    this.loadQuota();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listEmployees(this.page(), this.limit()).subscribe({
      next: (response) => {
        this.employees.set(response.employees);
        this.total.set(response.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('saas.admin.employees.msg_load_failed'));
        this.toast.error(this.translate.instant('saas.admin.employees.msg_load_failed'));
        this.loading.set(false);
      },
    });
  }

  loadQuota(): void {
    this.service.getTenantAdminSummary().subscribe({
      next: (summary) => {
        this.maxEmployees.set(summary.limits?.maxEmployees ?? null);
      },
      error: () => {
        // Non-critical — quota display is best-effort
      },
    });
  }

  onCreateEmployee(): void {
    if (!this.canWrite()) {
      return;
    }
    if (this.atQuota()) {
      this.toast.error(this.translate.instant('saas.admin.employees.msg_quota_exceeded'));
      return;
    }
    this.openEmployeeForm(null);
  }

  onTableAction(event: { actionKey: string; row: EmployeeRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const { actionKey, row } = event;
    if (actionKey === 'edit') {
      this.openEmployeeForm(row.employeeId);
    } else if (actionKey === 'delete') {
      this.onDeleteEmployee(row.employeeId, row.name);
    }
  }

  get employeeModalTitle(): string {
    return this.translate.instant(
      this.editingEmployeeId()
        ? 'saas.admin.employees.title_edit'
        : 'saas.admin.employees.title_create',
    );
  }

  onEmployeeFormSaved(): void {
    this.formModalOpen.set(false);
    this.editingEmployeeId.set(null);
    this.loadEmployees();
  }

  onEmployeeFormCancelled(): void {
    this.formModalOpen.set(false);
    this.editingEmployeeId.set(null);
  }

  onEmployeeModalClosed(): void {
    this.editingEmployeeId.set(null);
  }

  onDeleteEmployee(employeeId: string, employeeName: string): void {
    this.deletingEmployeeId.set(employeeId);
    this.employeeToDelete.set(employeeName);
    this.deleteConfirmModalOpen.set(true);
  }

  onDeleteConfirmClosed(): void {
    this.deleteConfirmModalOpen.set(false);
    this.deletingEmployeeId.set(null);
    this.employeeToDelete.set('');
  }

  onConfirmDeleteEmployee(): void {
    const employeeId = this.deletingEmployeeId();
    if (!employeeId) {
      return;
    }

    this.loading.set(true);
    this.deleteConfirmModalOpen.set(false);
    this.service.deleteEmployee(employeeId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('saas.admin.employees.msg_delete_success'));
        this.deletingEmployeeId.set(null);
        this.employeeToDelete.set('');
        this.loadEmployees();
      },
      error: (err) => {
        this.loading.set(false);
        const serverMessage: string = err?.error?.message || '';
        if (serverMessage === 'employee_has_open_assignments') {
          this.toast.error(this.translate.instant('saas.admin.employees.err_delete_has_assignments'));
        } else {
          this.toast.error(this.translate.instant('saas.admin.employees.msg_delete_failed'));
        }
        this.deletingEmployeeId.set(null);
        this.employeeToDelete.set('');
      },
    });
  }
  private openEmployeeForm(employeeId: string | null): void {
    this.editingEmployeeId.set(employeeId);
    this.formModalOpen.set(true);
  }

  trackByEmployeeId(_index: number, emp: EmployeeRow): string {
    return emp.employeeId;
  }
}

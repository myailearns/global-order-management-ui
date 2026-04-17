import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService } from '../../../../shared/components/alert';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { GomButtonComponent, GomInputComponent } from '../../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../../shared/components/table';
import { GomModalComponent } from '../../../../shared/components/modal';

import { TenantAccessService } from '../../services';
import { EmployeeProfile } from '../../models';
import { TRANSLATION_KEYS, UI_CONFIG } from '../../constants';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { EmployeeFormComponent } from '../form/employee-form.component';

interface EmployeeRow extends GomTableRow {
  employeeId: string;
  code: string;
  name: string;
  department: string;
  designation: string;
  status: string;
  linkedUser: string;
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
    GomButtonComponent,
    GomInputComponent,
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
  readonly searchControl = new FormControl('');

  readonly employees = signal<EmployeeProfile[]>([]);
  readonly page = signal(1);
  readonly limit = signal(UI_CONFIG.EMPLOYEES_PAGE_SIZE);
  readonly total = signal(0);
  readonly formModalOpen = signal(false);
  readonly editingEmployeeId = signal<string | null>(null);

  readonly filteredEmployees = computed<EmployeeRow[]>(() => {
    const search = this.searchControl.value?.trim().toLowerCase() || '';

    return this.employees()
      .filter((emp) => {
        if (!search) return true;
        return (
          emp.employeeCode.toLowerCase().includes(search)
          || emp.fullName.toLowerCase().includes(search)
          || (emp.department?.toLowerCase()?.includes(search) || false)
        );
      })
      .map((emp) => ({
        employeeId: emp._id,
        code: emp.employeeCode,
        name: emp.fullName,
        department: emp.department || '-',
        designation: emp.designation || '-',
        status: emp.status,
        linkedUser: typeof emp.userId === 'string'
          ? this.translate.instant('saas.admin.employees.val_linked')
          : (emp.userId?.email || this.translate.instant('saas.admin.employees.opt_not_linked')),
      }));
  });

  readonly columns = computed<GomTableColumn<EmployeeRow>[]>(() => {
    const baseColumns: GomTableColumn<EmployeeRow>[] = [
      { key: 'code', header: this.translate.instant(TRANSLATION_KEYS.TBL_EMPLOYEE_CODE), sortable: true, width: '10rem' },
      { key: 'name', header: this.translate.instant(TRANSLATION_KEYS.TBL_EMPLOYEE_NAME), sortable: true, width: '15rem' },
      { key: 'department', header: this.translate.instant(TRANSLATION_KEYS.TBL_EMPLOYEE_DEPT), width: '12rem' },
      { key: 'designation', header: this.translate.instant('saas.admin.employees.lbl_designation'), width: '14rem' },
      { key: 'status', header: this.translate.instant('saas.admin.employees.lbl_status'), width: '10rem' },
      { key: 'linkedUser', header: this.translate.instant('saas.admin.employees.lbl_linked_user'), width: '14rem' },
    ];

    if (!this.canWrite()) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        header: this.translate.instant('common.labels.actions'),
        width: '14rem',
        actionButtons: [
          { label: this.translate.instant('common.actions.edit'), actionKey: 'edit', variant: 'secondary' },
          { label: this.translate.instant('saas.admin.employees.btn_link_user'), actionKey: 'link', variant: 'primary' },
        ],
      },
    ];
  });

  readonly translationKeys = TRANSLATION_KEYS;

  ngOnInit(): void {
    this.loadEmployees();
    this.searchControl.valueChanges
      .pipe(debounceTime(UI_CONFIG.DEBOUNCE_SEARCH_MS), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
      });
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
        this.errorMessage.set('Failed to load employees');
        this.toast.error('Failed to load employees');
        this.loading.set(false);
      },
    });
  }

  onCreateEmployee(): void {
    if (!this.canWrite()) {
      return;
    }
    this.openEmployeeForm(null);
  }

  onTableAction(event: { actionKey: string; row: EmployeeRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const { actionKey, row } = event;
    switch (actionKey) {
      case 'edit':
        this.openEmployeeForm(row.employeeId);
        break;
      case 'link':
        this.openEmployeeForm(row.employeeId);
        break;
      default:
        break;
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

  private openEmployeeForm(employeeId: string | null): void {
    this.editingEmployeeId.set(employeeId);
    this.formModalOpen.set(true);
  }

  trackByEmployeeId(_index: number, emp: EmployeeRow): string {
    return emp.employeeId;
  }
}

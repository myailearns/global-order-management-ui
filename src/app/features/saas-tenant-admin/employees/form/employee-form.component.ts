import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { TenantAccessService } from '../../services';
import { CreateEmployeeRequest, EmployeeStatus, UpdateEmployeeRequest, UserWithRoles } from '../../models';

@Component({
  selector: 'gom-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
})
export class EmployeeFormComponent implements OnInit, OnChanges {
  @Input() modalMode = false;
  @Input() employeeIdInput: string | null = null;

  @Output() formSaved = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.group({
    employeeCode: ['', [Validators.required, Validators.minLength(2)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    department: [''],
    designation: [''],
    status: [EmployeeStatus.ACTIVE, [Validators.required]],
    userId: [''],
  });

  readonly statusOptions: GomSelectOption[] = [
    { value: EmployeeStatus.ACTIVE, label: this.translate.instant('common.status.active') },
    { value: EmployeeStatus.INACTIVE, label: this.translate.instant('common.status.inactive') },
    { value: EmployeeStatus.ON_LEAVE, label: this.translate.instant('saas.admin.employees.status_on_leave') },
  ];

  userOptions: GomSelectOption[] = [{ value: '', label: this.translate.instant('saas.admin.employees.opt_not_linked') }];
  users: UserWithRoles[] = [];

  employeeId: string | null = null;
  submitting = false;

  ngOnInit(): void {
    this.loadUsersForLinking();
    this.initializeFormContext();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.modalMode) {
      return;
    }

    if (changes['employeeIdInput'] || changes['modalMode']) {
      this.initializeFormContext();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toast.error(this.translate.instant('saas.admin.employees.msg_required_fields'));
      return;
    }

    this.submitting = true;

    if (this.employeeId) {
      const payload: UpdateEmployeeRequest = {
        fullName: this.form.controls.fullName.value || undefined,
        department: this.form.controls.department.value || undefined,
        designation: this.form.controls.designation.value || undefined,
        status: (this.form.controls.status.value as EmployeeStatus) || undefined,
        userId: this.form.controls.userId.value || null,
      };

      this.service.updateEmployee(this.employeeId, payload).subscribe({
        next: () => {
          this.toast.success(this.translate.instant('saas.admin.employees.msg_update_success'));
          this.afterSaveSuccess();
        },
        error: () => {
          this.submitting = false;
          this.toast.error(this.translate.instant('saas.admin.employees.msg_update_failed'));
        },
      });

      return;
    }

    const payload: CreateEmployeeRequest = {
      employeeCode: this.form.controls.employeeCode.value || '',
      fullName: this.form.controls.fullName.value || '',
      department: this.form.controls.department.value || undefined,
      designation: this.form.controls.designation.value || undefined,
      status: (this.form.controls.status.value as EmployeeStatus) || EmployeeStatus.ACTIVE,
      userId: this.form.controls.userId.value || undefined,
    };

    this.service.createEmployee(payload).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('saas.admin.employees.msg_create_success'));
        this.afterSaveSuccess();
      },
      error: () => {
        this.submitting = false;
        this.toast.error(this.translate.instant('saas.admin.employees.msg_create_failed'));
      },
    });
  }

  onCancel(): void {
    if (this.modalMode) {
      this.formCancelled.emit();
      return;
    }

    this.router.navigate(['/saas-admin/employees']);
  }

  private initializeFormContext(): void {
    const nextEmployeeId = this.modalMode
      ? (this.employeeIdInput || null)
      : this.route.snapshot.queryParamMap.get('id');

    this.employeeId = nextEmployeeId;
    this.submitting = false;

    if (this.employeeId) {
      this.form.controls.employeeCode.disable({ emitEvent: false });
      this.loadEmployee(this.employeeId);
      return;
    }

    this.form.reset({
      employeeCode: '',
      fullName: '',
      department: '',
      designation: '',
      status: EmployeeStatus.ACTIVE,
      userId: '',
    });
    this.form.controls.employeeCode.enable({ emitEvent: false });
  }

  private afterSaveSuccess(): void {
    this.submitting = false;
    if (this.modalMode) {
      this.formSaved.emit();
      return;
    }

    this.router.navigate(['/saas-admin/employees']);
  }

  private loadEmployee(employeeId: string): void {
    this.service.getEmployee(employeeId).subscribe({
      next: (employee) => {
        const linkedUserId = typeof employee.userId === 'string' ? employee.userId : (employee.userId?._id || '');
        this.form.patchValue({
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          department: employee.department || '',
          designation: employee.designation || '',
          status: employee.status || EmployeeStatus.ACTIVE,
          userId: linkedUserId,
        });
      },
      error: () => {
        this.toast.error(this.translate.instant('saas.admin.employees.msg_load_failed'));
      },
    });
  }

  private loadUsersForLinking(): void {
    this.service.listUsers(1, 200).subscribe({
      next: (response) => {
        this.users = response.users;
        this.userOptions = [
          { value: '', label: this.translate.instant('saas.admin.employees.opt_not_linked') },
          ...response.users.map((user) => ({
            value: user._id,
            label: `${user.fullName} (${user.email})`,
          })),
        ];
      },
      error: () => {
        this.toast.error(this.translate.instant('saas.admin.employees.msg_load_users_failed'));
      },
    });
  }
}

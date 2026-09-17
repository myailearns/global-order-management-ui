import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService, GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { TenantAccessService } from '../../services';
import { CreateEmployeeRequest, EmployeeStatus, UpdateEmployeeRequest } from '../../models';

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
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    passwordMode: ['auto', [Validators.required]],
    password: [''],
    status: [EmployeeStatus.ACTIVE, [Validators.required]],
  });

  readonly statusOptions: GomSelectOption[] = [
    { value: EmployeeStatus.ACTIVE, label: this.translate.instant('common.status.active') },
    { value: EmployeeStatus.INACTIVE, label: this.translate.instant('common.status.inactive') },
    { value: EmployeeStatus.ON_LEAVE, label: this.translate.instant('saas.admin.employees.status_on_leave') },
  ];

  employeeId: string | null = null;
  submitting = false;

  ngOnInit(): void {
    this.initializeFormContext();
    this.form.controls.passwordMode.valueChanges.subscribe(() => {
      this.updatePasswordValidators();
    });
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
        status: (this.form.controls.status.value as EmployeeStatus) || undefined,
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

    if (this.form.controls.passwordMode.value === 'manual' && !String(this.form.controls.password.value || '').trim()) {
      this.form.controls.password.setErrors({ required: true });
      this.toast.error(this.translate.instant('saas.admin.employees.msg_required_fields'));
      return;
    }

    const payload: CreateEmployeeRequest = {
      fullName: this.form.controls.fullName.value || '',
      email: this.form.controls.email.value || '',
      status: (this.form.controls.status.value as EmployeeStatus) || EmployeeStatus.ACTIVE,
      passwordMode: (this.form.controls.passwordMode.value as 'auto' | 'manual') || 'auto',
      password: this.form.controls.passwordMode.value === 'manual'
        ? (this.form.controls.password.value || '')
        : undefined,
    };

    this.service.createEmployee(payload).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('saas.admin.employees.msg_create_success'));
        this.afterSaveSuccess();
      },
      error: (err) => {
        this.submitting = false;
        const serverMessage: string = err?.error?.message || '';
        if (serverMessage === 'employee_code_exists') {
          this.toast.error(this.translate.instant('saas.admin.employees.err_code_exists'));
        } else if (serverMessage === 'email_already_in_use') {
          this.toast.error(this.translate.instant('saas.admin.employees.err_email_exists'));
        } else if (serverMessage === 'password_min_length_8') {
          this.toast.error(this.translate.instant('saas.admin.employees.err_password_min_8'));
        } else {
          this.toast.error(this.translate.instant('saas.admin.employees.msg_create_failed'));
        }
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
      this.form.controls.email.disable({ emitEvent: false });
      this.form.controls.passwordMode.disable({ emitEvent: false });
      this.form.controls.password.disable({ emitEvent: false });
      this.loadEmployee(this.employeeId);
      return;
    }

    this.form.reset({
      fullName: '',
      email: '',
      passwordMode: 'auto',
      password: '',
      status: EmployeeStatus.ACTIVE,
    });
    this.form.controls.email.enable({ emitEvent: false });
    this.form.controls.passwordMode.enable({ emitEvent: false });
    this.form.controls.password.enable({ emitEvent: false });
    this.updatePasswordValidators();
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
        const email = typeof employee.userId === 'string' ? '' : (employee.userId?.email || '');
        this.form.patchValue({
          fullName: employee.fullName,
          email,
          status: employee.status || EmployeeStatus.ACTIVE,
        });
      },
      error: () => {
        this.toast.error(this.translate.instant('saas.admin.employees.msg_load_failed'));
      },
    });
  }

  private updatePasswordValidators(): void {
    if (this.employeeId) {
      this.form.controls.password.clearValidators();
      this.form.controls.password.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (this.form.controls.passwordMode.value === 'manual') {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      this.form.controls.password.clearValidators();
      this.form.controls.password.setValue('', { emitEvent: false });
    }
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
  }
}

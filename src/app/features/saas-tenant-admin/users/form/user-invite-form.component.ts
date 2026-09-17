import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs';

import { GomAlertToastService, GomButtonComponent, GomCheckboxComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';

import { TenantAccessService } from '../../services';
import { CreateUserRequest, RoleWithPermissions, UpdateUserRequest, UserStatus } from '../../models';
import { TRANSLATION_KEYS } from '../../constants';

/**
 * EPIC 3 UI - S7: User Invite Form Component
 * Invite a new user to the tenant with role assignment
 */
@Component({
  selector: 'gom-user-invite-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomCheckboxComponent,
    GomInputComponent,
    GomSelectComponent,
  ],
  templateUrl: './user-invite-form.component.html',
  styleUrl: './user-invite-form.component.scss',
})
export class UserInviteFormComponent implements OnInit, OnChanges {
  @Input() modalMode = false;
  @Input() userIdInput: string | null = null;

  @Output() formSaved = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly inviteForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    sameAsMobile: [true, [Validators.required]],
    whatsappNumber: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^\d{10}$/)]],
    status: [UserStatus.ACTIVE, [Validators.required]],
    roleIds: [<string[]>[], [Validators.required]],
  });

  readonly availableRoles = signal<RoleWithPermissions[]>([]);
  readonly statusOptions: GomSelectOption[] = [
    { value: UserStatus.ACTIVE, label: this.translate.instant('saas.admin.users.opt_active') },
    { value: UserStatus.DISABLED, label: this.translate.instant('saas.admin.users.opt_disabled') },
  ];
  userId: string | null = null;
  submitting = false;
  submitAttempted = false;

  readonly translationKeys = TRANSLATION_KEYS;

  ngOnInit(): void {
    this.loadRoles();
    this.bindWhatsAppSync();
    this.initializeFormContext();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.modalMode) {
      return;
    }

    if (changes['userIdInput'] || changes['modalMode']) {
      this.initializeFormContext();
    }
  }

  private loadRoles(): void {
    this.service.listRoles().subscribe({
      next: (roles) => {
        this.availableRoles.set(roles.filter((role) => role.status === 'ACTIVE'));
      },
      error: () => {
        this.toast.error('Failed to load roles');
      },
    });
  }

  onSubmit(): void {
    this.submitAttempted = true;
    if (!this.inviteForm.valid) {
      this.toast.error(this.translate.instant('saas.admin.users.msg_required_fields'));
      return;
    }

    this.submitting = true;
    const raw = this.inviteForm.getRawValue();
    const requestPayload = this.buildUserPayload(raw);
    const roleIds = raw.roleIds || [];

    if (this.userId) {
      const updatePayload: UpdateUserRequest = {
        ...requestPayload,
        status: raw.status as UserStatus,
      };

      this.service.updateUser(this.userId, updatePayload)
        .pipe(
          switchMap(() => this.service.replaceUserRoles(this.userId as string, roleIds)),
          map(() => null),
        )
        .subscribe({
          next: () => {
            this.toast.success(this.translate.instant('saas.admin.users.msg_update_success'));
            this.afterSaveSuccess();
          },
          error: (err) => this.handleSubmitError(err, false),
        });
      return;
    }

    this.service.createUser(requestPayload as CreateUserRequest)
      .pipe(
        switchMap((createdUser) => this.service.replaceUserRoles(createdUser._id, roleIds)),
        map(() => null),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('saas.admin.users.msg_create_success'));
          this.afterSaveSuccess();
        },
        error: (err) => this.handleSubmitError(err, true),
      });
  }

  onCancel(): void {
    if (this.modalMode) {
      this.formCancelled.emit();
      return;
    }

    this.router.navigate(['/saas-admin/users']);
  }

  isRoleSelected(roleId: string): boolean {
    const roleIds = this.inviteForm.controls.roleIds.value || [];
    return roleIds.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const roleIds = [...(this.inviteForm.controls.roleIds.value || [])];
    const index = roleIds.indexOf(roleId);

    if (index > -1) {
      roleIds.splice(index, 1);
    } else {
      roleIds.push(roleId);
    }

    this.inviteForm.patchValue({ roleIds: [...roleIds] });
    this.inviteForm.controls.roleIds.markAsTouched();
  }

  get isSubmitDisabled(): boolean {
    return this.submitting || !this.inviteForm.valid;
  }

  get modalTitle(): string {
    return this.translate.instant(this.userId ? 'saas.admin.users.title_edit' : 'saas.admin.users.title_create');
  }

  get submitLabelKey(): string {
    return this.userId ? 'saas.admin.users.btn_update' : 'saas.admin.users.btn_create';
  }

  get showStatusField(): boolean {
    return !!this.userId;
  }

  hasControlError(controlName: string, errorCode: string): boolean {
    const control = this.inviteForm.get(controlName);
    return !!control?.hasError(errorCode) && (control.touched || this.submitAttempted);
  }

  private bindWhatsAppSync(): void {
    this.inviteForm.controls.sameAsMobile.valueChanges.subscribe((same) => {
      this.syncWhatsAppWithPhone(Boolean(same));
    });

    this.inviteForm.controls.phone.valueChanges.subscribe((phone) => {
      if (this.inviteForm.controls.sameAsMobile.value) {
        this.inviteForm.controls.whatsappNumber.setValue(String(phone || '').replace(/\D/g, ''), { emitEvent: false });
      }
    });
  }

  private initializeFormContext(): void {
    const nextUserId = this.modalMode
      ? (this.userIdInput || null)
      : this.route.snapshot.paramMap.get('id');

    this.userId = nextUserId;
    this.submitting = false;
    this.submitAttempted = false;

    if (this.userId) {
      this.loadUser(this.userId);
      return;
    }

    this.inviteForm.reset({
      fullName: '',
      email: '',
      phone: '',
      sameAsMobile: true,
      whatsappNumber: '',
      status: UserStatus.ACTIVE,
      roleIds: [],
    });
    this.syncWhatsAppWithPhone(true);
  }

  private loadUser(userId: string): void {
    this.service.getUser(userId).subscribe({
      next: (user) => {
        const sameAsMobile = !user.whatsappNumber || user.whatsappNumber === user.phone;
        this.inviteForm.reset({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          sameAsMobile,
          whatsappNumber: sameAsMobile ? user.phone : user.whatsappNumber,
          status: user.status === UserStatus.ACTIVE ? UserStatus.ACTIVE : UserStatus.DISABLED,
          roleIds: (user.assignedRoles || []).map((role) => role.roleId),
        });
        this.syncWhatsAppWithPhone(sameAsMobile);
      },
      error: () => {
        this.toast.error(this.translate.instant('saas.admin.users.msg_load_failed'));
      },
    });
  }

  private syncWhatsAppWithPhone(sameAsMobile: boolean): void {
    if (sameAsMobile) {
      const normalizedPhone = String(this.inviteForm.controls.phone.value || '').replace(/\D/g, '');
      this.inviteForm.controls.whatsappNumber.setValue(normalizedPhone, { emitEvent: false });
      this.inviteForm.controls.whatsappNumber.disable({ emitEvent: false });
      return;
    }

    this.inviteForm.controls.whatsappNumber.enable({ emitEvent: false });
  }

  private buildUserPayload(raw: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    sameAsMobile: boolean | null;
    whatsappNumber: string | null;
  }): Pick<CreateUserRequest, 'fullName' | 'email' | 'phone' | 'whatsappNumber'> {
    const normalizedPhone = String(raw.phone || '').replace(/\D/g, '');
    const normalizedWhatsapp = raw.sameAsMobile
      ? normalizedPhone
      : String(raw.whatsappNumber || '').replace(/\D/g, '');

    return {
      fullName: String(raw.fullName || '').trim(),
      email: String(raw.email || '').trim(),
      phone: normalizedPhone,
      whatsappNumber: normalizedWhatsapp,
    };
  }

  private afterSaveSuccess(): void {
    this.submitting = false;
    if (this.modalMode) {
      this.formSaved.emit();
      return;
    }

    this.router.navigate(['/saas-admin/users']);
  }

  private handleSubmitError(err: unknown, isCreate: boolean): void {
    this.submitting = false;
    const serverMessage = String((err as { error?: { message?: string } })?.error?.message || '').trim();

    if (serverMessage === 'email_already_in_use') {
      this.toast.error(this.translate.instant('saas.admin.users.err_email_exists'));
      return;
    }

    if (serverMessage === 'phone must be a valid 10 digit number') {
      this.toast.error(this.translate.instant('saas.admin.users.err_phone_invalid'));
      return;
    }

    if (serverMessage === 'whatsappNumber must be a valid 10 digit number') {
      this.toast.error(this.translate.instant('saas.admin.users.err_whatsapp_invalid'));
      return;
    }

    this.toast.error(this.translate.instant(isCreate ? 'saas.admin.users.msg_create_failed' : 'saas.admin.users.msg_update_failed'));
  }
}

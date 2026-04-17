import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { GomAlertToastService } from '../../../../shared/components/alert';
import { GomButtonComponent, GomInputComponent } from '../../../../shared/components/form-controls';
import { GomModalComponent } from '../../../../shared/components/modal';

import { TenantAccessService } from '../../services';
import { CreateUserRequest } from '../../models';
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
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
  ],
  templateUrl: './user-invite-form.component.html',
  styleUrl: './user-invite-form.component.scss',
})
export class UserInviteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);

  inviteForm!: FormGroup;
  submitting = false;
  submitAttempted = false;
  availableRoles: Array<{ _id: string; name: string }> = [];
  readonly inviteModalOpen = signal(true);

  readonly translationKeys = TRANSLATION_KEYS;

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
  }

  private initForm(): void {
    this.inviteForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9\-+\s()]{10,}$/)]],
      roleIds: [[], [Validators.required]],
    });
  }

  private loadRoles(): void {
    this.service.listRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles.map((r) => ({ _id: r._id, name: r.name }));
      },
      error: () => {
        this.toast.error('Failed to load roles');
      },
    });
  }

  onSubmit(): void {
    this.submitAttempted = true;
    if (!this.inviteForm.valid) {
      this.toast.error('Please fill in all required fields');
      return;
    }

    this.submitting = true;

    const createRequest: CreateUserRequest = {
      fullName: this.inviteForm.get('fullName')?.value,
      email: this.inviteForm.get('email')?.value,
      phone: this.inviteForm.get('phone')?.value || undefined,
    };

    const roleIds: string[] = this.inviteForm.get('roleIds')?.value || [];

    this.service.createUser(createRequest).subscribe({
      next: (createdUser) => {
        this.service.replaceUserRoles(createdUser._id, roleIds).subscribe({
          next: () => {
            this.toast.success('User invited successfully');
            this.router.navigate(['/saas-admin/users']);
          },
          error: () => {
            this.submitting = false;
            this.toast.error('User created but role assignment failed. Please assign roles from users list.');
            this.router.navigate(['/saas-admin/users']);
          },
        });
      },
      error: () => {
        this.submitting = false;
        this.toast.error('Failed to invite user');
      },
    });
  }

  onCancel(): void {
    this.inviteModalOpen.set(false);
    this.router.navigate(['/saas-admin/users']);
  }

  isRoleSelected(roleId: string): boolean {
    const roleIds = this.inviteForm.get('roleIds')?.value || [];
    return roleIds.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const roleIds = this.inviteForm.get('roleIds')?.value || [];
    const index = roleIds.indexOf(roleId);

    if (index > -1) {
      roleIds.splice(index, 1);
    } else {
      roleIds.push(roleId);
    }

    this.inviteForm.patchValue({ roleIds: [...roleIds] });
    this.inviteForm.get('roleIds')?.markAsTouched();
  }

  get isSubmitDisabled(): boolean {
    return this.submitting || !this.inviteForm.valid;
  }

  hasControlError(controlName: string, errorCode: string): boolean {
    const control = this.inviteForm.get(controlName);
    return !!control?.hasError(errorCode) && (control.touched || this.submitAttempted);
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { GomAlertToastService } from '../../../shared/components/alert';
import { GomButtonComponent, GomInputComponent } from '../../../shared/components/form-controls';
import { GomConfirmationModalComponent, GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  CustomerEngagementService,
  CustomerGroup,
  CustomerGroupMember,
} from '../customer-engagement.service';

interface CustomerMatch {
  _id: string;
  name: string;
  phone: string;
}

interface GroupRow extends GomTableRow {
  _id: string;
  name: string;
  code: string;
  status: string;
  memberCount: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-customer-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GomButtonComponent,
    GomInputComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './customer-groups.component.html',
  styleUrl: './customer-groups.component.scss',
})
export class CustomerGroupsComponent implements OnInit {
  private readonly service = inject(CustomerEngagementService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('customer-groups'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly groups = signal<CustomerGroup[]>([]);

  readonly formOpen = signal(false);
  readonly editingGroupId = signal<string | null>(null);

  readonly membersOpen = signal(false);
  readonly memberLoading = signal(false);
  readonly memberSearchLoading = signal(false);
  readonly members = signal<CustomerGroupMember[]>([]);
  readonly membersTarget = signal<CustomerGroup | null>(null);
  readonly customerMatches = signal<CustomerMatch[]>([]);
  readonly showExistingMembers = signal(false);

  readonly deactivateConfirmOpen = signal(false);
  readonly deactivateTarget = signal<CustomerGroup | null>(null);

  readonly groupForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    description: [''],
    tags: [''],
  });

  readonly addMemberForm = this.fb.group({
    phone: [''],
  });

  readonly columns: GomTableColumn<GroupRow>[] = [
    { key: 'name', header: 'Group', sortable: true, filterable: true, width: '14rem' },
    { key: 'code', header: 'Code', sortable: true, width: '9rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '8rem' },
    { key: 'memberCount', header: 'Members', sortable: true, width: '8rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '12rem',
      actionButtons: [
        {
          label: 'Edit',
          icon: 'ri-edit-line',
          actionKey: 'edit',
          variant: 'secondary',
        },
        {
          label: 'Members',
          icon: 'ri-team-line',
          actionKey: 'members',
          variant: 'secondary',
        },
        {
          label: (row) => String(row['status'] || '') === 'INACTIVE' ? 'Activate' : 'Deactivate',
          icon: (row) => String(row['status'] || '') === 'INACTIVE' ? 'ri-user-follow-line' : 'ri-user-unfollow-line',
          actionKey: 'toggle-status',
          variant: 'secondary',
        },
      ],
    },
  ];

  readonly rows = computed<GroupRow[]>(() =>
    this.groups().map((group) => ({
      _id: group._id,
      name: group.name,
      code: group.code || '-',
      status: group.status,
      memberCount: String(group.memberCount || 0),
      updatedAt: new Date(group.updatedAt).toLocaleDateString(),
      actions: 'Actions',
    }))
  );

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listCustomerGroups().subscribe({
      next: (response) => {
        this.groups.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(String(error?.error?.message || 'Failed to load customer groups.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingGroupId.set(null);
    this.groupForm.reset({
      name: '',
      code: '',
      description: '',
      tags: '',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingGroupId.set(null);
  }

  saveGroup(): void {
    this.groupForm.markAllAsTouched();
    if (this.groupForm.invalid) {
      return;
    }

    const raw = this.groupForm.getRawValue();
    const payload = {
      name: String(raw.name || '').trim(),
      code: String(raw.code || '').trim(),
      description: String(raw.description || '').trim(),
      tags: String(raw.tags || '').split(',').map((item) => item.trim()).filter(Boolean),
    };

    this.saving.set(true);

    const targetId = this.editingGroupId();
    const request$ = targetId
      ? this.service.updateCustomerGroup(targetId, payload)
      : this.service.createCustomerGroup(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(targetId ? 'Customer group updated.' : 'Customer group created.');
        this.saving.set(false);
        this.closeForm();
        this.loadGroups();
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to save customer group.'));
        this.saving.set(false);
      },
    });
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const rawId = event.row['_id'];
    const id = typeof rawId === 'string' ? rawId : '';
    const group = this.groups().find((item) => item._id === id);
    if (!group) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.editingGroupId.set(group._id);
      this.groupForm.reset({
        name: group.name,
        code: group.code || '',
        description: group.description || '',
        tags: (group.tags || []).join(', '),
      });
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'members') {
      this.openMembers(group);
      return;
    }

    if (event.actionKey === 'toggle-status') {
      this.deactivateTarget.set(group);
      this.deactivateConfirmOpen.set(true);
    }
  }

  openMembers(group: CustomerGroup): void {
    this.membersTarget.set(group);
    this.membersOpen.set(true);
    this.addMemberForm.reset({ phone: '' });
    this.customerMatches.set([]);
    this.memberSearchLoading.set(false);
    this.showExistingMembers.set(false);
    this.loadMembers(group._id);
  }

  closeMembers(): void {
    this.membersOpen.set(false);
    this.membersTarget.set(null);
    this.members.set([]);
    this.memberLoading.set(false);
    this.memberSearchLoading.set(false);
    this.customerMatches.set([]);
    this.showExistingMembers.set(false);
  }

  toggleExistingMembers(): void {
    this.showExistingMembers.update((current) => !current);
  }

  loadMembers(groupId: string): void {
    this.memberLoading.set(true);

    this.service.listGroupMembers(groupId).subscribe({
      next: (response) => {
        this.members.set(response.data || []);
        this.memberLoading.set(false);
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to load group members.'));
        this.memberLoading.set(false);
      },
    });
  }

  onMemberPhoneChange(value: string): void {
    const phone = String(value || '').trim();
    if (phone.length < 3) {
      this.customerMatches.set([]);
      this.memberSearchLoading.set(false);
      return;
    }

    this.memberSearchLoading.set(true);
    this.service.searchCustomers(phone).subscribe({
      next: (response) => {
        this.customerMatches.set(response.data || []);
        this.memberSearchLoading.set(false);
      },
      error: () => {
        this.customerMatches.set([]);
        this.memberSearchLoading.set(false);
      },
    });
  }

  addMemberByPhone(): void {
    const group = this.membersTarget();
    if (!group?._id) {
      return;
    }

    const phone = String(this.addMemberForm.controls.phone.value || '').trim();
    if (phone.length < 3) {
      this.toast.warning('Type at least 3 characters to search and add member.');
      return;
    }

    this.memberLoading.set(true);

    this.service.searchCustomers(phone).subscribe({
      next: (response) => {
        const customer = (response.data || [])[0];
        if (!customer?._id) {
          this.toast.warning('Customer not found for this phone.');
          this.memberLoading.set(false);
          return;
        }

        this.service.addGroupMembers(group._id, [customer._id]).subscribe({
          next: () => {
            this.toast.success('Customer assigned to group.');
            this.addMemberForm.reset({ phone: '' });
            this.loadMembers(group._id);
            this.loadGroups();
          },
          error: (error) => {
            this.toast.error(String(error?.error?.message || 'Failed to add member.'));
            this.memberLoading.set(false);
          },
        });
      },
      error: () => {
        this.toast.error('Failed to search customer by phone.');
        this.memberLoading.set(false);
      },
    });
  }

  assignMatchedCustomer(customer: CustomerMatch): void {
    const group = this.membersTarget();
    if (!group?._id || !customer?._id) {
      return;
    }

    this.memberLoading.set(true);
    this.service.addGroupMembers(group._id, [customer._id]).subscribe({
      next: () => {
        this.toast.success('Customer assigned to group.');
        this.addMemberForm.reset({ phone: '' });
        this.customerMatches.set([]);
        this.loadMembers(group._id);
        this.loadGroups();
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to add member.'));
        this.memberLoading.set(false);
      },
    });
  }

  isExistingMember(customerId: string): boolean {
    return this.members().some((member) => member.customerId === customerId && member.isActive);
  }

  removeMember(member: CustomerGroupMember): void {
    const group = this.membersTarget();
    if (!group?._id || !member.customerId) {
      return;
    }

    this.memberLoading.set(true);
    this.service.removeGroupMember(group._id, member.customerId).subscribe({
      next: () => {
        this.toast.success('Customer removed from group.');
        this.loadMembers(group._id);
        this.loadGroups();
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to remove member.'));
        this.memberLoading.set(false);
      },
    });
  }

  closeDeactivateConfirm(): void {
    this.deactivateConfirmOpen.set(false);
    this.deactivateTarget.set(null);
  }

  confirmDeactivate(): void {
    const target = this.deactivateTarget();
    if (!target?._id) {
      this.closeDeactivateConfirm();
      return;
    }

    this.saving.set(true);
    const shouldActivate = target.status === 'INACTIVE';
    const request$ = shouldActivate
      ? this.service.updateCustomerGroup(target._id, { status: 'ACTIVE' })
      : this.service.deactivateCustomerGroup(target._id);

    request$.subscribe({
      next: () => {
        this.toast.success(shouldActivate ? 'Customer group activated.' : 'Customer group deactivated.');
        this.saving.set(false);
        this.closeDeactivateConfirm();
        this.loadGroups();
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || (shouldActivate ? 'Failed to activate customer group.' : 'Failed to deactivate customer group.')));
        this.saving.set(false);
      },
    });
  }

  get deactivateMessage(): string {
    const target = this.deactivateTarget();
    if (!target) {
      return 'Confirm status update for this customer group.';
    }
    return target.status === 'INACTIVE'
      ? `Activate group ${target.name}?`
      : `Deactivate group ${target.name}?`;
  }

  get deactivateTitle(): string {
    const target = this.deactivateTarget();
    return target?.status === 'INACTIVE' ? 'Activate Customer Group' : 'Deactivate Customer Group';
  }

  get deactivateConfirmText(): string {
    const target = this.deactivateTarget();
    return target?.status === 'INACTIVE' ? 'Activate' : 'Deactivate';
  }

  get deactivateConfirmVariant(): 'primary' | 'secondary' | 'danger' {
    const target = this.deactivateTarget();
    return target?.status === 'INACTIVE' ? 'primary' : 'danger';
  }
}

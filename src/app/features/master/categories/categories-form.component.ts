import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormControlsModule } from '../../../shared/components/form-controls';

export interface CategoryFormData {
  name: string;
}

@Component({
  selector: 'gom-categories-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule],
  templateUrl: './categories-form.component.html',
  styleUrl: './categories-form.component.scss'
})
export class CategoriesFormComponent implements OnInit {
  @Input() initialData: CategoryFormData | null = null;
  @Input() isOpen = false;
  @Output() formSubmit = new EventEmitter<CategoryFormData>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  private readonly fb = inject(FormBuilder);

  ngOnInit() {
    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });

    if (this.initialData) {
      this.form.patchValue(this.initialData);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.value);
    }
  }

  onCancel() {
    this.form.reset();
    this.formCancel.emit();
  }
}

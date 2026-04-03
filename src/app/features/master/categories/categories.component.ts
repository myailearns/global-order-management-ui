import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriesService, Category } from './categories.service';
import { CategoriesListComponent, CategoryAction } from './categories-list.component';
import { CategoriesFormComponent, CategoryFormData } from './categories-form.component';

@Component({
  selector: 'gom-categories',
  standalone: true,
  imports: [CommonModule, CategoriesListComponent, CategoriesFormComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);

  categories = signal<Category[]>([]);
  loading = signal(false);
  formOpen = signal(false);
  selectedCategory = signal<Category | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.categoriesService.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.errorMessage.set('Failed to load categories. Please try again.');
        this.loading.set(false);
      }
    });
  }

  onAddNew() {
    this.selectedCategory.set(null);
    this.formOpen.set(true);
  }

  onAction(action: CategoryAction) {
    if (action.action === 'edit') {
      this.selectedCategory.set(action.category);
      this.formOpen.set(true);
    }
  }

  onFormSubmit(data: CategoryFormData) {
    this.loading.set(true);
    this.errorMessage.set(null);

    const selected = this.selectedCategory();
    const request = selected?._id
      ? this.categoriesService.updateCategory(selected._id, data)
      : this.categoriesService.createCategory(data);

    request.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.selectedCategory.set(null);
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error saving category:', error);
        this.errorMessage.set('Failed to save category. Please try again.');
        this.loading.set(false);
      }
    });
  }

  onFormCancel() {
    this.formOpen.set(false);
    this.selectedCategory.set(null);
  }
}

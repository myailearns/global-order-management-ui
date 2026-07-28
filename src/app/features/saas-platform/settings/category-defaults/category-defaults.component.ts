import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CategoryDefaultsService } from './services/category-defaults.service';
import { CategoryDefaults, CategoryDefaultTemplate, AttributeDefault } from './models/category-defaults.model';
import { EntitlementsService } from '../../entitlements/services/entitlements.service';

@Component({
  selector: 'app-category-defaults',
  templateUrl: './category-defaults.component.html',
  styleUrls: ['./category-defaults.component.scss']
})
export class CategoryDefaultsComponent implements OnInit {
  @ViewChild('categoryDefaultsTable') categoryDefaultsTable: any;

  categoryDefaults: CategoryDefaults[] = [];
  templates: CategoryDefaultTemplate[] = [];
  
  selectedCategory: CategoryDefaults | null = null;
  isLoadingDefaults = false;
  isLoadingTemplates = false;
  isSaving = false;
  
  defaultsForm: FormGroup;
  showDefaultsModal = false;
  showTemplateModal = false;
  editingMode = false;
  
  // Feature checks
  canViewDefaults = false;
  canEditDefaults = false;
  canManageTemplates = false;
  
  // Search and filter
  searchTerm = '';
  filterByModule = '';
  
  modules = ['all', 'product', 'pricing', 'inventory', 'compliance'];

  constructor(
    private fb: FormBuilder,
    private categoryDefaultsService: CategoryDefaultsService,
    private entitlementsService: EntitlementsService,
    private toastr: ToastrService
  ) {
    this.defaultsForm = this.createDefaultsForm();
  }

  ngOnInit(): void {
    this.checkEntitlements();
    if (this.canViewDefaults) {
      this.loadCategoryDefaults();
      this.loadTemplates();
    }
  }

  checkEntitlements(): void {
    this.canViewDefaults = this.entitlementsService.hasFeature('categoryDefaults.view');
    this.canEditDefaults = this.entitlementsService.hasFeature('categoryDefaults.edit');
    this.canManageTemplates = this.entitlementsService.hasFeature('categoryDefaults.template');
  }

  loadCategoryDefaults(): void {
    this.isLoadingDefaults = true;
    this.categoryDefaultsService.getCategoryDefaults().subscribe(
      (defaults) => {
        this.categoryDefaults = defaults;
        this.isLoadingDefaults = false;
      },
      (error) => {
        this.toastr.error('Failed to load category defaults');
        this.isLoadingDefaults = false;
      }
    );
  }

  loadTemplates(): void {
    if (!this.canManageTemplates) return;
    
    this.isLoadingTemplates = true;
    this.categoryDefaultsService.getTemplates().subscribe(
      (templates) => {
        this.templates = templates;
        this.isLoadingTemplates = false;
      },
      (error) => {
        this.isLoadingTemplates = false;
      }
    );
  }

  openDefaultsEditor(category?: CategoryDefaults): void {
    if (!this.canEditDefaults) {
      this.toastr.warn('You do not have permission to edit category defaults');
      return;
    }

    this.editingMode = !!category;
    if (category) {
      this.selectedCategory = { ...category };
      this.populateForm(category);
    } else {
      this.selectedCategory = null;
      this.defaultsForm.reset();
    }
    this.showDefaultsModal = true;
  }

  saveDefaults(): void {
    if (!this.defaultsForm.valid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    const formValue = this.defaultsForm.value;
    const defaults: CategoryDefaults = {
      id: this.selectedCategory?.id,
      categoryId: formValue.categoryId,
      categoryName: formValue.categoryName,
      attributeDefaults: formValue.attributeDefaults || [],
      priceDefaults: formValue.priceDefaults || {},
      inventoryDefaults: formValue.inventoryDefaults || {},
      complianceDefaults: formValue.complianceDefaults || {},
      metadata: formValue.metadata || {},
      applicableToSubcategories: formValue.applicableToSubcategories || false,
      templateId: formValue.templateId,
      createdAt: this.selectedCategory?.createdAt,
      updatedAt: new Date()
    };

    const request = this.editingMode
      ? this.categoryDefaultsService.updateCategoryDefaults(defaults)
      : this.categoryDefaultsService.createCategoryDefaults(defaults);

    request.subscribe(
      (result) => {
        this.toastr.success(
          this.editingMode ? 'Defaults updated successfully' : 'Defaults created successfully'
        );
        this.showDefaultsModal = false;
        this.loadCategoryDefaults();
        this.isSaving = false;
      },
      (error) => {
        this.toastr.error('Failed to save defaults');
        this.isSaving = false;
      }
    );
  }

  deleteDefaults(id: string): void {
    if (confirm('Are you sure you want to delete this category defaults configuration?')) {
      this.categoryDefaultsService.deleteCategoryDefaults(id).subscribe(
        () => {
          this.toastr.success('Defaults deleted successfully');
          this.loadCategoryDefaults();
        },
        (error) => {
          this.toastr.error('Failed to delete defaults');
        }
      );
    }
  }

  openTemplateManager(): void {
    if (!this.canManageTemplates) {
      this.toastr.warn('You do not have permission to manage templates');
      return;
    }
    this.showTemplateModal = true;
  }

  applyTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.defaultsForm.patchValue({
        attributeDefaults: template.attributeDefaults,
        priceDefaults: template.priceDefaults,
        inventoryDefaults: template.inventoryDefaults,
        complianceDefaults: template.complianceDefaults
      });
      this.toastr.success('Template applied');
    }
  }

  searchDefaults(): void {
    if (!this.searchTerm && !this.filterByModule) {
      this.loadCategoryDefaults();
      return;
    }

    this.categoryDefaultsService.searchCategoryDefaults({
      search: this.searchTerm,
      module: this.filterByModule === 'all' ? undefined : this.filterByModule
    }).subscribe(
      (results) => {
        this.categoryDefaults = results;
      },
      (error) => {
        this.toastr.error('Search failed');
      }
    );
  }

  exportDefaults(): void {
    if (this.categoryDefaults.length === 0) {
      this.toastr.warn('No defaults to export');
      return;
    }

    this.categoryDefaultsService.exportDefaults(this.categoryDefaults).subscribe(
      (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `category-defaults-${new Date().getTime()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('Defaults exported successfully');
      },
      (error) => {
        this.toastr.error('Export failed');
      }
    );
  }

  private createDefaultsForm(): FormGroup {
    return this.fb.group({
      categoryId: ['', Validators.required],
      categoryName: ['', Validators.required],
      attributeDefaults: [[]],
      priceDefaults: [{}],
      inventoryDefaults: [{}],
      complianceDefaults: [{}],
      metadata: [{}],
      applicableToSubcategories: [false],
      templateId: ['']
    });
  }

  private populateForm(defaults: CategoryDefaults): void {
    this.defaultsForm.patchValue({
      categoryId: defaults.categoryId,
      categoryName: defaults.categoryName,
      attributeDefaults: defaults.attributeDefaults,
      priceDefaults: defaults.priceDefaults,
      inventoryDefaults: defaults.inventoryDefaults,
      complianceDefaults: defaults.complianceDefaults,
      metadata: defaults.metadata,
      applicableToSubcategories: defaults.applicableToSubcategories,
      templateId: defaults.templateId
    });
  }
}

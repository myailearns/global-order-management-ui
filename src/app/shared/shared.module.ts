/**
 * Shared Module - GOM-UI
 * Central export for all shared functionality including theming and components
 * 
 * Usage in your app:
 *   import { SharedModule } from './shared/shared.module';
 *   
 *   @NgModule({
 *     imports: [SharedModule],
 *   })
 *   export class MyFeatureModule {}
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormControlsModule } from './components/form-controls/form-controls.module';
import { GomTableComponent } from './components/table/gom-table.component';
import { GomShellComponent } from './components/layout/gom-shell.component';
import { ThemedModule } from './theming/theming.module';

@NgModule({
  imports: [
    CommonModule,
    FormControlsModule,
    GomTableComponent,
    GomShellComponent,
    ThemedModule,
  ],
  exports: [
    CommonModule,
    FormControlsModule,
    GomTableComponent,
    GomShellComponent,
    ThemedModule,
  ],
})
export class SharedModule {}

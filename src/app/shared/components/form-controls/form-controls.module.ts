import { NgModule } from '@angular/core';

import { GomButtonComponent } from './button/gom-button.component';
import { GomCheckboxComponent } from './checkbox/gom-checkbox.component';
import { GomInputComponent } from './input/gom-input.component';
import { GomSelectComponent } from './select/gom-select.component';
import { GomSwitchComponent } from './switch/gom-switch.component';
import { GomTextareaComponent } from './textarea/gom-textarea.component';

@NgModule({
  imports: [
    GomButtonComponent,
    GomCheckboxComponent,
    GomInputComponent,
    GomSelectComponent,
    GomSwitchComponent,
    GomTextareaComponent,
  ],
  exports: [
    GomButtonComponent,
    GomCheckboxComponent,
    GomInputComponent,
    GomSelectComponent,
    GomSwitchComponent,
    GomTextareaComponent,
  ],
})
export class FormControlsModule {}

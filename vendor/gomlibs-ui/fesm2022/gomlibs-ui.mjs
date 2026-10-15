import * as i0 from '@angular/core';
import { EventEmitter, Output, Input, Component, forwardRef, inject, ElementRef, HostListener, NgModule, input, booleanAttribute, ChangeDetectionStrategy, model, output, effect, ViewEncapsulation, computed, Injectable, ChangeDetectorRef, ViewChild, HostBinding, signal } from '@angular/core';
import * as i1 from '@angular/common';
import { CommonModule } from '@angular/common';
import * as i1$1 from '@angular/forms';
import { NG_VALUE_ACCESSOR, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import * as i1$2 from '@ngx-translate/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

class GomButtonComponent {
    constructor() {
        this.type = 'button';
        this.variant = 'primary';
        this.size = 'default';
        this.disabled = false;
        this.ariaLabel = '';
        this.ariaExpanded = null;
        this.ariaHaspopup = null;
        this.ariaCurrent = null;
        this.buttonTitle = '';
        this.ariaRole = '';
        this.buttonClick = new EventEmitter();
    }
    handleClick(event) {
        if (this.disabled) {
            event.preventDefault();
            return;
        }
        this.buttonClick.emit(event);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomButtonComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.19", type: GomButtonComponent, isStandalone: true, selector: "gom-lib-button", inputs: { type: "type", variant: "variant", size: "size", disabled: "disabled", ariaLabel: "ariaLabel", ariaExpanded: "ariaExpanded", ariaHaspopup: "ariaHaspopup", ariaCurrent: "ariaCurrent", buttonTitle: "buttonTitle", ariaRole: "ariaRole" }, outputs: { buttonClick: "buttonClick" }, ngImport: i0, template: "<button\r\n  class=\"gom-button\"\r\n  [class.gom-button--secondary]=\"variant === 'secondary'\"\r\n  [class.gom-button--danger]=\"variant === 'danger'\"\r\n  [class.gom-button--ghost]=\"variant === 'ghost'\"\r\n  [class.gom-button--icon]=\"size === 'icon'\"\r\n  [class.gom-button--compact-icon]=\"size === 'compact-icon'\"\r\n  [type]=\"type\"\r\n  [disabled]=\"disabled\"\r\n  [attr.aria-label]=\"ariaLabel || null\"\r\n  [attr.aria-expanded]=\"ariaExpanded\"\r\n  [attr.aria-haspopup]=\"ariaHaspopup\"\r\n  [attr.aria-current]=\"ariaCurrent\"\r\n  [attr.title]=\"buttonTitle || null\"\r\n  [attr.role]=\"ariaRole || null\"\r\n  (click)=\"handleClick($event)\"\r\n>\r\n  <ng-content></ng-content>\r\n</button>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-button{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.5rem;padding:.5rem 1.5rem;border-radius:.5rem;border:.125rem solid #0a5d8b;background:#0a5d8b;color:#fff;transition:background-color .15s ease,border-color .15s ease,color .15s ease}.gom-button:hover:enabled,.gom-button:focus-visible:enabled{background:#1785ba;color:#fff}.gom-button:active:enabled{background:#074161;color:#fff}.gom-button:disabled{cursor:not-allowed;background:#f0f0f0;border-color:#d8d8d8;color:#8bceee}.gom-button--secondary{background:#fff;border-color:#0a5d8b;color:#0a5d8b}.gom-button--secondary:hover:enabled,.gom-button--secondary:focus-visible:enabled{background:#f6f6f6;border-color:#1785ba;color:#1785ba}.gom-button--secondary:active:enabled{background:#fff;border-color:#074161;color:#074161}.gom-button--secondary:disabled{background:#fff;border-color:#d8d8d8;color:#767676}.gom-button--danger{background:#eb0a1e;border-color:#eb0a1e;color:#fff}.gom-button--danger:hover:enabled,.gom-button--danger:focus-visible:enabled{background:#92050a;border-color:#eb0a1e;color:#fff}.gom-button--danger:active:enabled{background:#92050a;border-color:#eb0a1e;color:#fff}.gom-button--danger:disabled{background:#f0f0f0;border-color:#d8d8d8;color:#767676}.gom-button--ghost{border-color:transparent;background:transparent;color:#0a5d8b}.gom-button--ghost:hover:enabled,.gom-button--ghost:focus-visible:enabled{border-color:transparent;background:#f6f6f6;color:#1785ba}.gom-button--ghost:active:enabled{border-color:transparent;background:#f0f0f0;color:#074161}.gom-button--icon{width:2.75rem;min-width:2.75rem;min-height:2.75rem;padding:0}.gom-button--compact-icon{width:2rem;min-width:2rem;min-height:2rem;padding:0}.gom-button i{font-size:1.125rem;display:inline-flex;align-items:center;justify-content:center}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomButtonComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-button', standalone: true, imports: [CommonModule], template: "<button\r\n  class=\"gom-button\"\r\n  [class.gom-button--secondary]=\"variant === 'secondary'\"\r\n  [class.gom-button--danger]=\"variant === 'danger'\"\r\n  [class.gom-button--ghost]=\"variant === 'ghost'\"\r\n  [class.gom-button--icon]=\"size === 'icon'\"\r\n  [class.gom-button--compact-icon]=\"size === 'compact-icon'\"\r\n  [type]=\"type\"\r\n  [disabled]=\"disabled\"\r\n  [attr.aria-label]=\"ariaLabel || null\"\r\n  [attr.aria-expanded]=\"ariaExpanded\"\r\n  [attr.aria-haspopup]=\"ariaHaspopup\"\r\n  [attr.aria-current]=\"ariaCurrent\"\r\n  [attr.title]=\"buttonTitle || null\"\r\n  [attr.role]=\"ariaRole || null\"\r\n  (click)=\"handleClick($event)\"\r\n>\r\n  <ng-content></ng-content>\r\n</button>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-button{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.5rem;padding:.5rem 1.5rem;border-radius:.5rem;border:.125rem solid #0a5d8b;background:#0a5d8b;color:#fff;transition:background-color .15s ease,border-color .15s ease,color .15s ease}.gom-button:hover:enabled,.gom-button:focus-visible:enabled{background:#1785ba;color:#fff}.gom-button:active:enabled{background:#074161;color:#fff}.gom-button:disabled{cursor:not-allowed;background:#f0f0f0;border-color:#d8d8d8;color:#8bceee}.gom-button--secondary{background:#fff;border-color:#0a5d8b;color:#0a5d8b}.gom-button--secondary:hover:enabled,.gom-button--secondary:focus-visible:enabled{background:#f6f6f6;border-color:#1785ba;color:#1785ba}.gom-button--secondary:active:enabled{background:#fff;border-color:#074161;color:#074161}.gom-button--secondary:disabled{background:#fff;border-color:#d8d8d8;color:#767676}.gom-button--danger{background:#eb0a1e;border-color:#eb0a1e;color:#fff}.gom-button--danger:hover:enabled,.gom-button--danger:focus-visible:enabled{background:#92050a;border-color:#eb0a1e;color:#fff}.gom-button--danger:active:enabled{background:#92050a;border-color:#eb0a1e;color:#fff}.gom-button--danger:disabled{background:#f0f0f0;border-color:#d8d8d8;color:#767676}.gom-button--ghost{border-color:transparent;background:transparent;color:#0a5d8b}.gom-button--ghost:hover:enabled,.gom-button--ghost:focus-visible:enabled{border-color:transparent;background:#f6f6f6;color:#1785ba}.gom-button--ghost:active:enabled{border-color:transparent;background:#f0f0f0;color:#074161}.gom-button--icon{width:2.75rem;min-width:2.75rem;min-height:2.75rem;padding:0}.gom-button--compact-icon{width:2rem;min-width:2rem;min-height:2rem;padding:0}.gom-button i{font-size:1.125rem;display:inline-flex;align-items:center;justify-content:center}\n"] }]
        }], propDecorators: { type: [{
                type: Input
            }], variant: [{
                type: Input
            }], size: [{
                type: Input
            }], disabled: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], ariaExpanded: [{
                type: Input
            }], ariaHaspopup: [{
                type: Input
            }], ariaCurrent: [{
                type: Input
            }], buttonTitle: [{
                type: Input
            }], ariaRole: [{
                type: Input
            }], buttonClick: [{
                type: Output
            }] } });

class GomCheckboxComponent {
    constructor() {
        this.label = '';
        this.hint = '';
        this.error = '';
        this.id = `gom-checkbox-${Math.random().toString(36).slice(2, 9)}`;
        this.checkedChange = new EventEmitter();
        this.checked = false;
        this.disabled = false;
        this.onChange = () => { };
        this.onTouched = () => { };
    }
    writeValue(value) {
        this.checked = !!value;
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(disabled) {
        this.disabled = disabled;
    }
    handleChange(event) {
        const nextValue = event.target.checked;
        this.checked = nextValue;
        this.onChange(nextValue);
        this.checkedChange.emit(nextValue);
    }
    handleBlur() {
        this.onTouched();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomCheckboxComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomCheckboxComponent, isStandalone: true, selector: "gom-lib-checkbox", inputs: { label: "label", hint: "hint", error: "error", id: "id" }, outputs: { checkedChange: "checkedChange" }, providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => GomCheckboxComponent),
                multi: true,
            },
        ], ngImport: i0, template: "<div class=\"gom-checkbox-wrapper\">\r\n  <input\r\n    class=\"gom-checkbox\"\r\n    [id]=\"id\"\r\n    type=\"checkbox\"\r\n    [checked]=\"checked\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    (change)=\"handleChange($event)\"\r\n    (blur)=\"handleBlur()\"\r\n  />\r\n  <label class=\"gom-checkbox__label\" [for]=\"id\">{{ label }}</label>\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\">{{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\">{{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-checkbox-wrapper{display:inline-flex;align-items:center;gap:.5rem}.gom-checkbox{width:1rem;height:1rem;accent-color:#0a5d8b;cursor:pointer}.gom-checkbox:disabled{cursor:not-allowed}.gom-checkbox__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#212121;cursor:pointer}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomCheckboxComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-checkbox', standalone: true, imports: [CommonModule], providers: [
                        {
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => GomCheckboxComponent),
                            multi: true,
                        },
                    ], template: "<div class=\"gom-checkbox-wrapper\">\r\n  <input\r\n    class=\"gom-checkbox\"\r\n    [id]=\"id\"\r\n    type=\"checkbox\"\r\n    [checked]=\"checked\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    (change)=\"handleChange($event)\"\r\n    (blur)=\"handleBlur()\"\r\n  />\r\n  <label class=\"gom-checkbox__label\" [for]=\"id\">{{ label }}</label>\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\">{{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\">{{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-checkbox-wrapper{display:inline-flex;align-items:center;gap:.5rem}.gom-checkbox{width:1rem;height:1rem;accent-color:#0a5d8b;cursor:pointer}.gom-checkbox:disabled{cursor:not-allowed}.gom-checkbox__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#212121;cursor:pointer}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}\n"] }]
        }], propDecorators: { label: [{
                type: Input
            }], hint: [{
                type: Input
            }], error: [{
                type: Input
            }], id: [{
                type: Input
            }], checkedChange: [{
                type: Output
            }] } });

class GomInputComponent {
    constructor() {
        this.label = '';
        this.required = false;
        this.type = 'text';
        this.placeholder = '';
        this.hint = '';
        this.error = '';
        this.leadingIcon = '';
        this.clearable = false;
        this.id = `gom-input-${Math.random().toString(36).slice(2, 9)}`;
        this.ariaLabel = '';
        this.valueChange = new EventEmitter();
        this.value = '';
        this.disabled = false;
        this.onChange = () => { };
        this.onTouched = () => { };
    }
    writeValue(value) {
        this.value = value ?? '';
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(disabled) {
        this.disabled = disabled;
    }
    handleInput(event) {
        const nextValue = event.target.value;
        this.value = nextValue;
        this.onChange(nextValue);
        this.valueChange.emit(nextValue);
    }
    handleBlur() {
        this.onTouched();
    }
    clearValue() {
        if (this.disabled) {
            return;
        }
        this.value = '';
        this.onChange('');
        this.valueChange.emit('');
        this.onTouched();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomInputComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomInputComponent, isStandalone: true, selector: "gom-lib-input", inputs: { label: "label", required: "required", type: "type", min: "min", max: "max", step: "step", placeholder: "placeholder", inputmode: "inputmode", hint: "hint", error: "error", leadingIcon: "leadingIcon", clearable: "clearable", id: "id", ariaLabel: "ariaLabel", disabled: "disabled" }, outputs: { valueChange: "valueChange" }, providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => GomInputComponent),
                multi: true,
            },
        ], ngImport: i0, template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__input-wrapper\">\r\n  @if (leadingIcon) {\r\n    <i [class]=\"'gom-control__leading-icon ' + leadingIcon\" aria-hidden=\"true\"></i>\r\n  }\r\n  <input\r\n    class=\"gom-control__field\"\r\n    [class.gom-control__field--with-leading-icon]=\"!!leadingIcon\"\r\n    [class.gom-control__field--clearable]=\"clearable && !!value\"\r\n    [id]=\"id\"\r\n    [type]=\"type\"\r\n    [value]=\"value\"\r\n    [attr.min]=\"min ?? null\"\r\n    [attr.max]=\"max ?? null\"\r\n    [attr.step]=\"step ?? null\"\r\n    [placeholder]=\"placeholder\"\r\n    [attr.inputmode]=\"inputmode ?? null\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    [attr.aria-label]=\"ariaLabel || null\"\r\n    (input)=\"handleInput($event)\"\r\n    (blur)=\"handleBlur()\"\r\n  />\r\n  @if (clearable && value && !disabled) {\r\n    <button class=\"gom-control__clear\" type=\"button\" aria-label=\"Clear input\" (click)=\"clearValue()\">\r\n      <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n    </button>\r\n  }\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--with-leading-icon{padding-left:2.25rem}.gom-control__field--clearable{padding-right:2.25rem}.gom-control__leading-icon{position:absolute;left:1rem;z-index:1;color:#58595b;pointer-events:none}.gom-control__clear{position:absolute;right:.5rem;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:#58595b;cursor:pointer}.gom-control__clear:hover{color:#0a5d8b}.gom-control__clear:focus-visible{border-radius:.25rem;outline:2px solid #0a5d8b;outline-offset:2px}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__input-wrapper{position:relative;display:flex;align-items:center}.gom-control__icon{position:absolute;right:.5rem;display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__icon i{font-size:1.125rem}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomInputComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-input', standalone: true, imports: [CommonModule], providers: [
                        {
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => GomInputComponent),
                            multi: true,
                        },
                    ], template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__input-wrapper\">\r\n  @if (leadingIcon) {\r\n    <i [class]=\"'gom-control__leading-icon ' + leadingIcon\" aria-hidden=\"true\"></i>\r\n  }\r\n  <input\r\n    class=\"gom-control__field\"\r\n    [class.gom-control__field--with-leading-icon]=\"!!leadingIcon\"\r\n    [class.gom-control__field--clearable]=\"clearable && !!value\"\r\n    [id]=\"id\"\r\n    [type]=\"type\"\r\n    [value]=\"value\"\r\n    [attr.min]=\"min ?? null\"\r\n    [attr.max]=\"max ?? null\"\r\n    [attr.step]=\"step ?? null\"\r\n    [placeholder]=\"placeholder\"\r\n    [attr.inputmode]=\"inputmode ?? null\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    [attr.aria-label]=\"ariaLabel || null\"\r\n    (input)=\"handleInput($event)\"\r\n    (blur)=\"handleBlur()\"\r\n  />\r\n  @if (clearable && value && !disabled) {\r\n    <button class=\"gom-control__clear\" type=\"button\" aria-label=\"Clear input\" (click)=\"clearValue()\">\r\n      <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n    </button>\r\n  }\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--with-leading-icon{padding-left:2.25rem}.gom-control__field--clearable{padding-right:2.25rem}.gom-control__leading-icon{position:absolute;left:1rem;z-index:1;color:#58595b;pointer-events:none}.gom-control__clear{position:absolute;right:.5rem;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:#58595b;cursor:pointer}.gom-control__clear:hover{color:#0a5d8b}.gom-control__clear:focus-visible{border-radius:.25rem;outline:2px solid #0a5d8b;outline-offset:2px}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__input-wrapper{position:relative;display:flex;align-items:center}.gom-control__icon{position:absolute;right:.5rem;display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__icon i{font-size:1.125rem}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"] }]
        }], propDecorators: { label: [{
                type: Input
            }], required: [{
                type: Input
            }], type: [{
                type: Input
            }], min: [{
                type: Input
            }], max: [{
                type: Input
            }], step: [{
                type: Input
            }], placeholder: [{
                type: Input
            }], inputmode: [{
                type: Input
            }], hint: [{
                type: Input
            }], error: [{
                type: Input
            }], leadingIcon: [{
                type: Input
            }], clearable: [{
                type: Input
            }], id: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], valueChange: [{
                type: Output
            }], disabled: [{
                type: Input
            }] } });

class GomSelectComponent {
    constructor() {
        this.label = '';
        this.required = false;
        this.placeholder = 'Select an option';
        this.options = [];
        this.isDisabled = false;
        this.hint = '';
        this.error = '';
        this.id = `gom-select-${Math.random().toString(36).slice(2, 9)}`;
        this.multiple = false;
        this.selectedValues = [];
        this.searchable = false;
        this.searchPlaceholder = 'Search...';
        this.selectAllLabel = 'Select all';
        this.ariaLabel = '';
        this.valueChange = new EventEmitter();
        this.selectedValuesChange = new EventEmitter();
        this.el = inject((ElementRef));
        this.value = '';
        this.disabled = false;
        this.menuOpen = false;
        this.menuOpenUpward = false;
        this.searchTerm = '';
        this.menuStyles = {};
        this.onChange = () => { };
        this.onTouched = () => { };
    }
    ngOnChanges(changes) {
        if (changes['closeMenuTrigger'] && !changes['closeMenuTrigger'].firstChange) {
            this.closeMenu();
        }
    }
    get displayLabel() {
        if (this.multiple) {
            if (!this.selectedValues.length) {
                return this.placeholder;
            }
            const selectedLabels = this.options
                .filter((option) => this.selectedValues.includes(option.value))
                .map((option) => option.label);
            if (!selectedLabels.length) {
                return this.placeholder;
            }
            if (selectedLabels.length <= 2) {
                return selectedLabels.join(', ');
            }
            return `${selectedLabels[0]}, +${selectedLabels.length - 1}`;
        }
        const selected = this.options.find((option) => option.value === this.value);
        return selected?.label || this.placeholder;
    }
    get filteredOptions() {
        if (!this.searchable) {
            return this.options;
        }
        const query = this.searchTerm.trim().toLowerCase();
        if (!query) {
            return this.options;
        }
        return this.options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(query));
    }
    get showSelectAll() {
        return this.multiple && this.filteredOptions.length > 0;
    }
    get isAllVisibleSelected() {
        if (!this.multiple || !this.filteredOptions.length) {
            return false;
        }
        const selected = new Set(this.selectedValues);
        return this.filteredOptions.every((option) => selected.has(option.value));
    }
    writeValue(value) {
        if (this.multiple) {
            this.selectedValues = Array.isArray(value) ? value : [];
            return;
        }
        this.value = typeof value === 'string' ? value : '';
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(disabled) {
        this.disabled = disabled;
    }
    toggleMenu() {
        if (this.disabled || this.isDisabled) {
            return;
        }
        this.menuOpen = !this.menuOpen;
        if (this.menuOpen) {
            if (this.searchable) {
                this.searchTerm = '';
            }
            // Compute synchronously first so menu renders at correct position (no flash at top:0).
            this.computeMenuPosition();
            // Re-compute after render to get accurate menu offsetHeight for maxHeight capping.
            requestAnimationFrame(() => this.computeMenuPosition());
        }
    }
    onSearchInput(event) {
        const target = event.target;
        this.searchTerm = target?.value || '';
    }
    selectOption(value) {
        if (this.disabled || this.isDisabled) {
            return;
        }
        if (this.multiple) {
            const next = new Set(this.selectedValues);
            if (next.has(value)) {
                next.delete(value);
            }
            else {
                next.add(value);
            }
            this.selectedValues = [...next];
            this.selectedValuesChange.emit(this.selectedValues);
            this.onChange([...this.selectedValues]);
            return;
        }
        this.value = value;
        this.valueChange.emit(value);
        this.onChange(value);
        this.menuOpen = false;
        this.onTouched();
    }
    toggleSelectAll() {
        if (!this.multiple || this.disabled || this.isDisabled) {
            return;
        }
        const targetOptions = this.filteredOptions;
        if (!targetOptions.length) {
            return;
        }
        const next = new Set(this.selectedValues);
        if (this.isAllVisibleSelected) {
            for (const option of targetOptions) {
                next.delete(option.value);
            }
        }
        else {
            for (const option of targetOptions) {
                next.add(option.value);
            }
        }
        this.selectedValues = [...next];
        this.selectedValuesChange.emit(this.selectedValues);
        this.onChange([...this.selectedValues]);
    }
    isSelected(optionValue) {
        return this.multiple
            ? this.selectedValues.includes(optionValue)
            : this.value === optionValue;
    }
    onDocumentClick(event) {
        if (!this.menuOpen) {
            return;
        }
        const target = event.target;
        if (target && !this.el.nativeElement.contains(target)) {
            this.closeMenu();
        }
    }
    onWindowResize() {
        if (!this.menuOpen) {
            return;
        }
        this.updateMenuDirection();
    }
    onViewportScroll() {
        if (!this.menuOpen) {
            return;
        }
        this.updateMenuDirection();
    }
    updateMenuDirection() {
        requestAnimationFrame(() => this.computeMenuPosition());
    }
    computeMenuPosition() {
        if (!this.menuOpen) {
            return;
        }
        const wrapper = this.el.nativeElement.querySelector('.gom-control__select-wrapper');
        const menu = this.el.nativeElement.querySelector('.gom-control__menu');
        if (!wrapper) {
            this.menuOpenUpward = false;
            return;
        }
        const rect = wrapper.getBoundingClientRect();
        const menuHeight = menu?.offsetHeight || 224;
        const safeGap = 12;
        const menuGap = 4;
        const spaceBelow = window.innerHeight - rect.bottom - safeGap;
        const spaceAbove = rect.top - safeGap;
        // Prefer opening downward. Flip upward only when below space is too tight.
        const minimumMenuHeight = 120;
        this.menuOpenUpward = spaceBelow < minimumMenuHeight && spaceAbove > spaceBelow;
        const maxHeight = Math.max(120, Math.floor(this.menuOpenUpward ? spaceAbove : spaceBelow));
        const preferredHeight = Math.min(menuHeight, maxHeight);
        const rawTop = this.menuOpenUpward
            ? rect.top - preferredHeight - menuGap
            : rect.bottom + menuGap;
        const availableWidth = Math.max(160, Math.floor(window.innerWidth - rect.left - safeGap));
        const width = Math.min(Math.floor(rect.width), availableWidth);
        this.menuStyles = {
            position: 'fixed',
            top: `${Math.max(safeGap, Math.round(rawTop))}px`,
            left: `${Math.max(safeGap, Math.round(rect.left))}px`,
            width: `${Math.round(width)}px`,
            maxHeight: `${Math.round(maxHeight)}px`,
        };
    }
    closeMenu() {
        this.menuOpen = false;
        this.menuOpenUpward = false;
        this.menuStyles = {};
        if (this.searchable) {
            this.searchTerm = '';
        }
        this.onTouched();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomSelectComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomSelectComponent, isStandalone: true, selector: "gom-lib-select", inputs: { label: "label", required: "required", placeholder: "placeholder", options: "options", isDisabled: "isDisabled", hint: "hint", error: "error", id: "id", multiple: "multiple", selectedValues: "selectedValues", searchable: "searchable", searchPlaceholder: "searchPlaceholder", selectAllLabel: "selectAllLabel", closeMenuTrigger: "closeMenuTrigger", ariaLabel: "ariaLabel" }, outputs: { valueChange: "valueChange", selectedValuesChange: "selectedValuesChange" }, host: { listeners: { "document:click": "onDocumentClick($event)", "window:resize": "onWindowResize()", "window:scroll": "onViewportScroll()", "document:scroll": "onViewportScroll()" } }, providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => GomSelectComponent),
                multi: true,
            },
        ], usesOnChanges: true, ngImport: i0, template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__select-wrapper\" [class.gom-control__select-wrapper--open]=\"menuOpen\">\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-control__field gom-control__field--trigger\"\r\n    [id]=\"id\"\r\n    [disabled]=\"disabled || isDisabled\"\r\n    [class.gom-control__field--open]=\"menuOpen\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    [attr.aria-label]=\"ariaLabel || label || null\"\r\n    (click)=\"toggleMenu()\"\r\n  >\r\n    <span class=\"gom-control__trigger-text\">{{ displayLabel }}</span>\r\n    <span class=\"gom-control__select-icon\">\r\n      <i class=\"ri-arrow-down-s-line\" aria-hidden=\"true\"></i>\r\n    </span>\r\n  </button>\r\n\r\n  @if (menuOpen) {\r\n    <div class=\"gom-control__menu\" [class.gom-control__menu--upward]=\"menuOpenUpward\" [ngStyle]=\"menuStyles\">\r\n      @if (searchable) {\r\n        <div class=\"gom-control__menu-search\" (click)=\"$event.stopPropagation()\" (keydown)=\"$event.stopPropagation()\">\r\n          <input\r\n            type=\"search\"\r\n            class=\"gom-control__menu-search-input\"\r\n            [placeholder]=\"searchPlaceholder\"\r\n            [value]=\"searchTerm\"\r\n            (input)=\"onSearchInput($event)\"\r\n          />\r\n        </div>\r\n      }\r\n\r\n      @if (showSelectAll) {\r\n        <button\r\n          type=\"button\"\r\n          class=\"gom-control__menu-item gom-control__menu-item--select-all\"\r\n          [class.gom-control__menu-item--selected]=\"isAllVisibleSelected\"\r\n          (click)=\"toggleSelectAll()\"\r\n        >\r\n          <input type=\"checkbox\" [checked]=\"isAllVisibleSelected\" tabindex=\"-1\" />\r\n          <span>{{ selectAllLabel }}</span>\r\n        </button>\r\n      }\r\n\r\n      @if (!filteredOptions.length) {\r\n        <div class=\"gom-control__menu-empty\">No options found</div>\r\n      }\r\n\r\n      @for (option of filteredOptions; track option.value) {\r\n        <button\r\n          type=\"button\"\r\n          class=\"gom-control__menu-item\"\r\n          [class.gom-control__menu-item--selected]=\"isSelected(option.value)\"\r\n          (click)=\"selectOption(option.value)\"\r\n        >\r\n          @if (multiple) {\r\n            <input type=\"checkbox\" [checked]=\"isSelected(option.value)\" tabindex=\"-1\" />\r\n          }\r\n          <span>{{ option.label }}</span>\r\n        </button>\r\n      }\r\n    </div>\r\n  }\r\n\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__select-wrapper{position:relative}.gom-control__select-wrapper--open{z-index:40}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--trigger{display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer}.gom-control__field--open{border-color:#0a5d8b}.gom-control__trigger-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gom-control__select-icon{display:flex;align-items:center;color:#9e9e9e}.gom-control__select-icon i{font-size:1.125rem}.gom-control__menu{position:fixed;z-index:2000;top:0;left:0;width:100%;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;max-height:14rem;overflow-y:auto;box-shadow:0 12px 24px #0000001f}.gom-control__menu-search{padding:.5rem;border-bottom:.0625rem solid #d8d8d8;position:sticky;top:0;background:#fff;z-index:1}.gom-control__menu-search-input{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;border:.125rem solid #d8d8d8;border-radius:.25rem;padding:.25rem .5rem;background:#fff;color:#212121}.gom-control__menu-search-input:focus{outline:none;border-color:#0a5d8b}.gom-control__menu-empty{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;padding:.5rem 1rem}.gom-control__menu--upward{top:0}.gom-control__menu-item{width:100%;border:0;background:transparent;text-align:left;display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;cursor:pointer}.gom-control__menu-item:hover,.gom-control__menu-item--selected{background:#e6f7ff}.gom-control__menu-item--select-all{position:sticky;top:0;background:#fff;border-bottom:.0625rem solid #d8d8d8;z-index:1;font-weight:600}.gom-control__icon{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__icon i{font-size:1.125rem}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomSelectComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-select', standalone: true, imports: [CommonModule], providers: [
                        {
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => GomSelectComponent),
                            multi: true,
                        },
                    ], template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__select-wrapper\" [class.gom-control__select-wrapper--open]=\"menuOpen\">\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-control__field gom-control__field--trigger\"\r\n    [id]=\"id\"\r\n    [disabled]=\"disabled || isDisabled\"\r\n    [class.gom-control__field--open]=\"menuOpen\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    [attr.aria-label]=\"ariaLabel || label || null\"\r\n    (click)=\"toggleMenu()\"\r\n  >\r\n    <span class=\"gom-control__trigger-text\">{{ displayLabel }}</span>\r\n    <span class=\"gom-control__select-icon\">\r\n      <i class=\"ri-arrow-down-s-line\" aria-hidden=\"true\"></i>\r\n    </span>\r\n  </button>\r\n\r\n  @if (menuOpen) {\r\n    <div class=\"gom-control__menu\" [class.gom-control__menu--upward]=\"menuOpenUpward\" [ngStyle]=\"menuStyles\">\r\n      @if (searchable) {\r\n        <div class=\"gom-control__menu-search\" (click)=\"$event.stopPropagation()\" (keydown)=\"$event.stopPropagation()\">\r\n          <input\r\n            type=\"search\"\r\n            class=\"gom-control__menu-search-input\"\r\n            [placeholder]=\"searchPlaceholder\"\r\n            [value]=\"searchTerm\"\r\n            (input)=\"onSearchInput($event)\"\r\n          />\r\n        </div>\r\n      }\r\n\r\n      @if (showSelectAll) {\r\n        <button\r\n          type=\"button\"\r\n          class=\"gom-control__menu-item gom-control__menu-item--select-all\"\r\n          [class.gom-control__menu-item--selected]=\"isAllVisibleSelected\"\r\n          (click)=\"toggleSelectAll()\"\r\n        >\r\n          <input type=\"checkbox\" [checked]=\"isAllVisibleSelected\" tabindex=\"-1\" />\r\n          <span>{{ selectAllLabel }}</span>\r\n        </button>\r\n      }\r\n\r\n      @if (!filteredOptions.length) {\r\n        <div class=\"gom-control__menu-empty\">No options found</div>\r\n      }\r\n\r\n      @for (option of filteredOptions; track option.value) {\r\n        <button\r\n          type=\"button\"\r\n          class=\"gom-control__menu-item\"\r\n          [class.gom-control__menu-item--selected]=\"isSelected(option.value)\"\r\n          (click)=\"selectOption(option.value)\"\r\n        >\r\n          @if (multiple) {\r\n            <input type=\"checkbox\" [checked]=\"isSelected(option.value)\" tabindex=\"-1\" />\r\n          }\r\n          <span>{{ option.label }}</span>\r\n        </button>\r\n      }\r\n    </div>\r\n  }\r\n\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__select-wrapper{position:relative}.gom-control__select-wrapper--open{z-index:40}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--trigger{display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer}.gom-control__field--open{border-color:#0a5d8b}.gom-control__trigger-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gom-control__select-icon{display:flex;align-items:center;color:#9e9e9e}.gom-control__select-icon i{font-size:1.125rem}.gom-control__menu{position:fixed;z-index:2000;top:0;left:0;width:100%;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;max-height:14rem;overflow-y:auto;box-shadow:0 12px 24px #0000001f}.gom-control__menu-search{padding:.5rem;border-bottom:.0625rem solid #d8d8d8;position:sticky;top:0;background:#fff;z-index:1}.gom-control__menu-search-input{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;border:.125rem solid #d8d8d8;border-radius:.25rem;padding:.25rem .5rem;background:#fff;color:#212121}.gom-control__menu-search-input:focus{outline:none;border-color:#0a5d8b}.gom-control__menu-empty{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;padding:.5rem 1rem}.gom-control__menu--upward{top:0}.gom-control__menu-item{width:100%;border:0;background:transparent;text-align:left;display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;cursor:pointer}.gom-control__menu-item:hover,.gom-control__menu-item--selected{background:#e6f7ff}.gom-control__menu-item--select-all{position:sticky;top:0;background:#fff;border-bottom:.0625rem solid #d8d8d8;z-index:1;font-weight:600}.gom-control__icon{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__icon i{font-size:1.125rem}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"] }]
        }], propDecorators: { label: [{
                type: Input
            }], required: [{
                type: Input
            }], placeholder: [{
                type: Input
            }], options: [{
                type: Input
            }], isDisabled: [{
                type: Input
            }], hint: [{
                type: Input
            }], error: [{
                type: Input
            }], id: [{
                type: Input
            }], multiple: [{
                type: Input
            }], selectedValues: [{
                type: Input
            }], searchable: [{
                type: Input
            }], searchPlaceholder: [{
                type: Input
            }], selectAllLabel: [{
                type: Input
            }], closeMenuTrigger: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], valueChange: [{
                type: Output
            }], selectedValuesChange: [{
                type: Output
            }], onDocumentClick: [{
                type: HostListener,
                args: ['document:click', ['$event']]
            }], onWindowResize: [{
                type: HostListener,
                args: ['window:resize']
            }], onViewportScroll: [{
                type: HostListener,
                args: ['window:scroll']
            }, {
                type: HostListener,
                args: ['document:scroll']
            }] } });

class GomSwitchComponent {
    constructor() {
        this.checked = false;
        this.disabled = false;
        this.leftText = 'Off';
        this.rightText = 'On';
        this.leftIcon = '';
        this.rightIcon = '';
        this.ariaLabel = 'Toggle';
        this.checkedChange = new EventEmitter();
    }
    toggle() {
        if (this.disabled) {
            return;
        }
        this.checkedChange.emit(!this.checked);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomSwitchComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomSwitchComponent, isStandalone: true, selector: "gom-lib-switch", inputs: { checked: "checked", disabled: "disabled", leftText: "leftText", rightText: "rightText", leftIcon: "leftIcon", rightIcon: "rightIcon", ariaLabel: "ariaLabel" }, outputs: { checkedChange: "checkedChange" }, ngImport: i0, template: "<div class=\"gom-switch\" [class.gom-switch--disabled]=\"disabled\">\r\n  <span class=\"gom-switch__side\" [class.gom-switch__side--active]=\"!checked\">\r\n    @if (leftIcon) {\r\n      <i [class]=\"leftIcon\" aria-hidden=\"true\"></i>\r\n    }\r\n    <span>{{ leftText }}</span>\r\n  </span>\r\n\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-switch__button\"\r\n    role=\"switch\"\r\n    [attr.aria-label]=\"ariaLabel\"\r\n    [attr.aria-checked]=\"checked\"\r\n    [disabled]=\"disabled\"\r\n    (click)=\"toggle()\"\r\n  >\r\n    <span class=\"gom-switch__track\" [class.gom-switch__track--checked]=\"checked\">\r\n      <span class=\"gom-switch__thumb\"></span>\r\n    </span>\r\n  </button>\r\n\r\n  <span class=\"gom-switch__side\" [class.gom-switch__side--active]=\"checked\">\r\n    @if (rightIcon) {\r\n      <i [class]=\"rightIcon\" aria-hidden=\"true\"></i>\r\n    }\r\n    <span>{{ rightText }}</span>\r\n  </span>\r\n</div>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-switch{display:inline-flex;align-items:center;gap:.5rem}.gom-switch__side{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;gap:.25rem;color:#9e9e9e}.gom-switch__side i{font-size:1rem}.gom-switch__side--active{color:#0a5d8b}.gom-switch__button{padding:0;border:0;background:transparent;cursor:pointer}.gom-switch__button:disabled{cursor:not-allowed}.gom-switch__track{display:inline-flex;align-items:center;width:2.75rem;padding:2px;border-radius:999px;background:#f0f0f0;border:.125rem solid #d8d8d8;transition:background-color .2s ease,border-color .2s ease}.gom-switch__track--checked{background:#0a5d8b;border-color:#0a5d8b}.gom-switch__track--checked .gom-switch__thumb{transform:translate(1.25rem)}.gom-switch__thumb{width:1rem;height:1rem;border-radius:999px;background:#fff;box-shadow:0 1px 3px #0f172a40;transition:transform .2s ease}.gom-switch--disabled .gom-switch__side{color:#767676}.gom-switch--disabled .gom-switch__track{background:#f0f0f0;border-color:#d8d8d8}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomSwitchComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-switch', standalone: true, imports: [CommonModule], template: "<div class=\"gom-switch\" [class.gom-switch--disabled]=\"disabled\">\r\n  <span class=\"gom-switch__side\" [class.gom-switch__side--active]=\"!checked\">\r\n    @if (leftIcon) {\r\n      <i [class]=\"leftIcon\" aria-hidden=\"true\"></i>\r\n    }\r\n    <span>{{ leftText }}</span>\r\n  </span>\r\n\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-switch__button\"\r\n    role=\"switch\"\r\n    [attr.aria-label]=\"ariaLabel\"\r\n    [attr.aria-checked]=\"checked\"\r\n    [disabled]=\"disabled\"\r\n    (click)=\"toggle()\"\r\n  >\r\n    <span class=\"gom-switch__track\" [class.gom-switch__track--checked]=\"checked\">\r\n      <span class=\"gom-switch__thumb\"></span>\r\n    </span>\r\n  </button>\r\n\r\n  <span class=\"gom-switch__side\" [class.gom-switch__side--active]=\"checked\">\r\n    @if (rightIcon) {\r\n      <i [class]=\"rightIcon\" aria-hidden=\"true\"></i>\r\n    }\r\n    <span>{{ rightText }}</span>\r\n  </span>\r\n</div>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-switch{display:inline-flex;align-items:center;gap:.5rem}.gom-switch__side{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;gap:.25rem;color:#9e9e9e}.gom-switch__side i{font-size:1rem}.gom-switch__side--active{color:#0a5d8b}.gom-switch__button{padding:0;border:0;background:transparent;cursor:pointer}.gom-switch__button:disabled{cursor:not-allowed}.gom-switch__track{display:inline-flex;align-items:center;width:2.75rem;padding:2px;border-radius:999px;background:#f0f0f0;border:.125rem solid #d8d8d8;transition:background-color .2s ease,border-color .2s ease}.gom-switch__track--checked{background:#0a5d8b;border-color:#0a5d8b}.gom-switch__track--checked .gom-switch__thumb{transform:translate(1.25rem)}.gom-switch__thumb{width:1rem;height:1rem;border-radius:999px;background:#fff;box-shadow:0 1px 3px #0f172a40;transition:transform .2s ease}.gom-switch--disabled .gom-switch__side{color:#767676}.gom-switch--disabled .gom-switch__track{background:#f0f0f0;border-color:#d8d8d8}\n"] }]
        }], propDecorators: { checked: [{
                type: Input
            }], disabled: [{
                type: Input
            }], leftText: [{
                type: Input
            }], rightText: [{
                type: Input
            }], leftIcon: [{
                type: Input
            }], rightIcon: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], checkedChange: [{
                type: Output
            }] } });

class GomTextareaComponent {
    constructor() {
        this.label = '';
        this.required = false;
        this.placeholder = '';
        this.rows = 4;
        this.hint = '';
        this.error = '';
        this.id = `gom-textarea-${Math.random().toString(36).slice(2, 9)}`;
        this.valueChange = new EventEmitter();
        this.focus = new EventEmitter();
        this.value = '';
        this.disabled = false;
        this.onChange = () => { };
        this.onTouched = () => { };
    }
    writeValue(value) {
        this.value = value ?? '';
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(disabled) {
        this.disabled = disabled;
    }
    handleInput(event) {
        const nextValue = event.target.value;
        this.value = nextValue;
        this.onChange(nextValue);
        this.valueChange.emit(nextValue);
    }
    handleBlur() {
        this.onTouched();
    }
    handleFocus() {
        this.focus.emit();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTextareaComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomTextareaComponent, isStandalone: true, selector: "gom-lib-textarea", inputs: { label: "label", required: "required", placeholder: "placeholder", rows: "rows", hint: "hint", error: "error", id: "id" }, outputs: { valueChange: "valueChange", focus: "focus" }, providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => GomTextareaComponent),
                multi: true,
            },
        ], ngImport: i0, template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__textarea-wrapper\">\r\n  <textarea\r\n    class=\"gom-control__field gom-control__field--textarea\"\r\n    [id]=\"id\"\r\n    [value]=\"value\"\r\n    [rows]=\"rows\"\r\n    [placeholder]=\"placeholder\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    (input)=\"handleInput($event)\"\r\n    (focus)=\"handleFocus()\"\r\n    (blur)=\"handleBlur()\"\r\n  ></textarea>\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--textarea{resize:vertical;min-height:6rem}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__textarea-wrapper{position:relative;display:flex;align-items:flex-start}.gom-control__textarea-wrapper .gom-control__icon{position:absolute;right:.5rem;top:.5rem;display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__textarea-wrapper .gom-control__icon i{font-size:1.125rem}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTextareaComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-textarea', standalone: true, imports: [CommonModule], providers: [
                        {
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => GomTextareaComponent),
                            multi: true,
                        },
                    ], template: "@if (label) {\r\n  <label class=\"gom-control__label\" [for]=\"id\">\r\n    {{ label }}\r\n    @if (required) {\r\n      <span class=\"gom-control__required\" aria-hidden=\"true\">*</span>\r\n    }\r\n  </label>\r\n}\r\n\r\n<div class=\"gom-control__textarea-wrapper\">\r\n  <textarea\r\n    class=\"gom-control__field gom-control__field--textarea\"\r\n    [id]=\"id\"\r\n    [value]=\"value\"\r\n    [rows]=\"rows\"\r\n    [placeholder]=\"placeholder\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-invalid]=\"!!error\"\r\n    (input)=\"handleInput($event)\"\r\n    (focus)=\"handleFocus()\"\r\n    (blur)=\"handleBlur()\"\r\n  ></textarea>\r\n  @if (error) {\r\n    <div class=\"gom-control__icon\">\r\n      <i class=\"ri-alert-circle-line\" aria-hidden=\"true\"></i>\r\n    </div>\r\n  }\r\n</div>\r\n\r\n@if (error) {\r\n  <p class=\"gom-control__message gom-control__message--error\"><i class=\"ri-error-warning-line\"></i> {{ error }}</p>\r\n} @else if (hint) {\r\n  <p class=\"gom-control__message\"><i class=\"ri-information-line\"></i> {{ hint }}</p>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:grid;gap:.5rem}.gom-control__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#212121}.gom-control__required{color:#eb0a1e;margin-left:.25rem}.gom-control__field{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;width:100%;padding:.5rem 1rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;color:#212121}.gom-control__field:hover:not(:disabled){border-color:#1785ba}.gom-control__field:focus{border-color:#0a5d8b;box-shadow:0 0 0 3px #0a5d8b24;outline:none}.gom-control__field:disabled{border-color:#d8d8d8;background:#f0f0f0;color:#767676;cursor:not-allowed}.gom-control__field--textarea{resize:vertical;min-height:6rem}.gom-control__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2;color:#9e9e9e;margin:0}.gom-control__message--error{color:#eb0a1e}.gom-control__textarea-wrapper{position:relative;display:flex;align-items:flex-start}.gom-control__textarea-wrapper .gom-control__icon{position:absolute;right:.5rem;top:.5rem;display:flex;align-items:center;color:#eb0a1e;pointer-events:none}.gom-control__textarea-wrapper .gom-control__icon i{font-size:1.125rem}.gom-control__message i{margin-right:.25rem;vertical-align:middle}\n"] }]
        }], propDecorators: { label: [{
                type: Input
            }], required: [{
                type: Input
            }], placeholder: [{
                type: Input
            }], rows: [{
                type: Input
            }], hint: [{
                type: Input
            }], error: [{
                type: Input
            }], id: [{
                type: Input
            }], valueChange: [{
                type: Output
            }], focus: [{
                type: Output
            }] } });

class FormControlsModule {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: FormControlsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.19", ngImport: i0, type: FormControlsModule, imports: [GomButtonComponent,
            GomCheckboxComponent,
            GomInputComponent,
            GomSelectComponent,
            GomSwitchComponent,
            GomTextareaComponent], exports: [GomButtonComponent,
            GomCheckboxComponent,
            GomInputComponent,
            GomSelectComponent,
            GomSwitchComponent,
            GomTextareaComponent] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: FormControlsModule, imports: [GomButtonComponent,
            GomCheckboxComponent,
            GomInputComponent,
            GomSelectComponent,
            GomSwitchComponent,
            GomTextareaComponent] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: FormControlsModule, decorators: [{
            type: NgModule,
            args: [{
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
                }]
        }] });

class GomCardComponent {
    constructor() {
        this.contentGutter = input(true, ...(ngDevMode ? [{ debugName: "contentGutter", transform: booleanAttribute }] : [{ transform: booleanAttribute }]));
        this.contentGap = input(true, ...(ngDevMode ? [{ debugName: "contentGap", transform: booleanAttribute }] : [{ transform: booleanAttribute }]));
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomCardComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "20.3.19", type: GomCardComponent, isStandalone: true, selector: "gom-lib-card, [gomLibCard]", inputs: { contentGutter: { classPropertyName: "contentGutter", publicName: "contentGutter", isSignal: true, isRequired: false, transformFunction: null }, contentGap: { classPropertyName: "contentGap", publicName: "contentGap", isSignal: true, isRequired: false, transformFunction: null } }, host: { properties: { "class.gom-card--content-gutter": "contentGutter()", "class.gom-card--content-gap": "contentGap()" }, classAttribute: "gom-card" }, ngImport: i0, template: "<ng-content></ng-content>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{box-sizing:border-box;display:flex;flex-direction:column;border-radius:.5rem;border:.125rem solid #d8d8d8;background:#fff}:host(.gom-card--content-gap){gap:.75rem}:host(.gom-card--content-gutter){padding:1rem}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomCardComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-card, [gomLibCard]', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        class: 'gom-card',
                        '[class.gom-card--content-gutter]': 'contentGutter()',
                        '[class.gom-card--content-gap]': 'contentGap()',
                    }, template: "<ng-content></ng-content>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{box-sizing:border-box;display:flex;flex-direction:column;border-radius:.5rem;border:.125rem solid #d8d8d8;background:#fff}:host(.gom-card--content-gap){gap:.75rem}:host(.gom-card--content-gutter){padding:1rem}\n"] }]
        }], propDecorators: { contentGutter: [{ type: i0.Input, args: [{ isSignal: true, alias: "contentGutter", required: false }] }], contentGap: [{ type: i0.Input, args: [{ isSignal: true, alias: "contentGap", required: false }] }] } });

class GomChipComponent {
    constructor() {
        this.tone = 'neutral';
        this.size = 'default';
        this.fullWidth = false;
        this.interactive = false;
        this.selected = false;
        this.disabled = false;
        this.ariaLabel = '';
        this.ariaRole = '';
        this.chipClick = new EventEmitter();
    }
    handleClick(event) {
        if (this.disabled) {
            event.preventDefault();
            return;
        }
        this.chipClick.emit(event);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomChipComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomChipComponent, isStandalone: true, selector: "gom-lib-chip", inputs: { tone: "tone", size: "size", fullWidth: "fullWidth", interactive: "interactive", selected: "selected", disabled: "disabled", ariaLabel: "ariaLabel", ariaRole: "ariaRole" }, outputs: { chipClick: "chipClick" }, ngImport: i0, template: "<ng-template #chipContent><ng-content></ng-content></ng-template>\r\n\r\n@if (interactive) {\r\n  <button\r\n    type=\"button\"\r\n    [class]=\"'gom-chip gom-chip--interactive gom-chip--' + tone\"\r\n    [class.gom-chip--compact]=\"size === 'compact'\"\r\n    [class.gom-chip--dense]=\"size === 'dense'\"\r\n    [class.gom-chip--full-width]=\"fullWidth\"\r\n    [class.gom-chip--selected]=\"selected\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-label]=\"ariaLabel || null\"\r\n    [attr.aria-selected]=\"ariaRole === 'tab' ? selected : null\"\r\n    [attr.aria-checked]=\"ariaRole === 'menuitemradio' ? selected : null\"\r\n    [attr.role]=\"ariaRole || null\"\r\n    (click)=\"handleClick($event)\"\r\n  >\r\n    <ng-container [ngTemplateOutlet]=\"chipContent\"></ng-container>\r\n  </button>\r\n} @else {\r\n  <span\r\n    class=\"gom-chip\"\r\n    [class]=\"'gom-chip gom-chip--' + tone\"\r\n    [class.gom-chip--compact]=\"size === 'compact'\"\r\n    [class.gom-chip--full-width]=\"fullWidth\"\r\n  >\r\n    <ng-container [ngTemplateOutlet]=\"chipContent\"></ng-container>\r\n  </span>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:inline-flex}.gom-chip{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;min-height:1.75rem;padding:.15rem .625rem;border-radius:9999px;border:.125rem solid transparent;font-size:.72rem;line-height:1;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}.gom-chip--interactive{cursor:pointer;font:inherit;text-transform:none;transition:background-color .12s ease,border-color .12s ease,color .12s ease}.gom-chip--interactive:hover:not(:disabled),.gom-chip--interactive:focus-visible:not(:disabled){border-color:#0a5d8b;color:#0a5d8b}.gom-chip--interactive:focus-visible{outline:2px solid #0a5d8b;outline-offset:2px}.gom-chip--interactive:disabled{cursor:not-allowed;opacity:.55}.gom-chip--compact{min-height:1.875rem;padding:.25rem 1rem}.gom-chip--dense{min-height:1.35rem;padding:.1rem .5rem;font-size:.65rem}.gom-chip--full-width{width:100%;justify-content:space-between}.gom-chip--neutral{background:#f0f0f0;color:#212121;border-color:#d8d8d8}.gom-chip--info{background:#e7f3ff;color:#0b5fa6;border-color:#b8d9f5}.gom-chip--warning{background:#fff3dd;color:#8a5b00;border-color:#f1d39d}.gom-chip--success{background:#e6f7ea;color:#1b7d3c;border-color:#b7e2c4}.gom-chip--danger{background:#ffe8e8;color:#a52020;border-color:#f0b7b7}.gom-chip--pending{background:#f2ecff;color:#5b21b6;border-color:#d7c8ff}.gom-chip--progress{background:#e8f4ff;color:#0b5fa6;border-color:#bfdcf5}.gom-chip--shipped{background:#e6fbff;color:#0f766e;border-color:#b5e8e2}.gom-chip--delivered{background:#e8f9ed;color:#166534;border-color:#b8e3c7}.gom-chip--cancelled{background:#fff0f0;color:#991b1b;border-color:#f2c1c1}.gom-chip--interactive.gom-chip--selected{border-color:#0a5d8b;background:#0a5d8b;color:#fff}.gom-chip--interactive.gom-chip--selected:hover:not(:disabled),.gom-chip--interactive.gom-chip--selected:focus-visible:not(:disabled){border-color:#1785ba;background:#1785ba;color:#fff}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomChipComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-chip', standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: "<ng-template #chipContent><ng-content></ng-content></ng-template>\r\n\r\n@if (interactive) {\r\n  <button\r\n    type=\"button\"\r\n    [class]=\"'gom-chip gom-chip--interactive gom-chip--' + tone\"\r\n    [class.gom-chip--compact]=\"size === 'compact'\"\r\n    [class.gom-chip--dense]=\"size === 'dense'\"\r\n    [class.gom-chip--full-width]=\"fullWidth\"\r\n    [class.gom-chip--selected]=\"selected\"\r\n    [disabled]=\"disabled\"\r\n    [attr.aria-label]=\"ariaLabel || null\"\r\n    [attr.aria-selected]=\"ariaRole === 'tab' ? selected : null\"\r\n    [attr.aria-checked]=\"ariaRole === 'menuitemradio' ? selected : null\"\r\n    [attr.role]=\"ariaRole || null\"\r\n    (click)=\"handleClick($event)\"\r\n  >\r\n    <ng-container [ngTemplateOutlet]=\"chipContent\"></ng-container>\r\n  </button>\r\n} @else {\r\n  <span\r\n    class=\"gom-chip\"\r\n    [class]=\"'gom-chip gom-chip--' + tone\"\r\n    [class.gom-chip--compact]=\"size === 'compact'\"\r\n    [class.gom-chip--full-width]=\"fullWidth\"\r\n  >\r\n    <ng-container [ngTemplateOutlet]=\"chipContent\"></ng-container>\r\n  </span>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:inline-flex}.gom-chip{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;min-height:1.75rem;padding:.15rem .625rem;border-radius:9999px;border:.125rem solid transparent;font-size:.72rem;line-height:1;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}.gom-chip--interactive{cursor:pointer;font:inherit;text-transform:none;transition:background-color .12s ease,border-color .12s ease,color .12s ease}.gom-chip--interactive:hover:not(:disabled),.gom-chip--interactive:focus-visible:not(:disabled){border-color:#0a5d8b;color:#0a5d8b}.gom-chip--interactive:focus-visible{outline:2px solid #0a5d8b;outline-offset:2px}.gom-chip--interactive:disabled{cursor:not-allowed;opacity:.55}.gom-chip--compact{min-height:1.875rem;padding:.25rem 1rem}.gom-chip--dense{min-height:1.35rem;padding:.1rem .5rem;font-size:.65rem}.gom-chip--full-width{width:100%;justify-content:space-between}.gom-chip--neutral{background:#f0f0f0;color:#212121;border-color:#d8d8d8}.gom-chip--info{background:#e7f3ff;color:#0b5fa6;border-color:#b8d9f5}.gom-chip--warning{background:#fff3dd;color:#8a5b00;border-color:#f1d39d}.gom-chip--success{background:#e6f7ea;color:#1b7d3c;border-color:#b7e2c4}.gom-chip--danger{background:#ffe8e8;color:#a52020;border-color:#f0b7b7}.gom-chip--pending{background:#f2ecff;color:#5b21b6;border-color:#d7c8ff}.gom-chip--progress{background:#e8f4ff;color:#0b5fa6;border-color:#bfdcf5}.gom-chip--shipped{background:#e6fbff;color:#0f766e;border-color:#b5e8e2}.gom-chip--delivered{background:#e8f9ed;color:#166534;border-color:#b8e3c7}.gom-chip--cancelled{background:#fff0f0;color:#991b1b;border-color:#f2c1c1}.gom-chip--interactive.gom-chip--selected{border-color:#0a5d8b;background:#0a5d8b;color:#fff}.gom-chip--interactive.gom-chip--selected:hover:not(:disabled),.gom-chip--interactive.gom-chip--selected:focus-visible:not(:disabled){border-color:#1785ba;background:#1785ba;color:#fff}\n"] }]
        }], propDecorators: { tone: [{
                type: Input
            }], size: [{
                type: Input
            }], fullWidth: [{
                type: Input
            }], interactive: [{
                type: Input
            }], selected: [{
                type: Input
            }], disabled: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], ariaRole: [{
                type: Input
            }], chipClick: [{
                type: Output
            }] } });

class GomModalComponent {
    constructor() {
        this.el = inject((ElementRef));
        /**
         * Controls visibility of the modal
         */
        this.show = model(false, ...(ngDevMode ? [{ debugName: "show" }] : []));
        /**
         * Title of the modal
         */
        this.title = input('', ...(ngDevMode ? [{ debugName: "title" }] : []));
        /**
         * Determines if clicking outside modal closes it
         * @default false
         */
        this.closeOnBackdropClick = input(false, ...(ngDevMode ? [{ debugName: "closeOnBackdropClick" }] : []));
        /**
         * Determines if escape key closes modal
         * @default true
         */
        this.closeOnEscape = input(true, ...(ngDevMode ? [{ debugName: "closeOnEscape" }] : []));
        /**
         * Determines if close button is shown
         * @default true
         */
        this.showCloseButton = input(true, ...(ngDevMode ? [{ debugName: "showCloseButton" }] : []));
        /**
         * Size variant: small | medium | large
         * @default 'medium'
         */
        this.size = input('medium', ...(ngDevMode ? [{ debugName: "size" }] : []));
        /** Mobile-only presentation; desktop remains a centered dialog. */
        this.mobilePresentation = input('dialog', ...(ngDevMode ? [{ debugName: "mobilePresentation" }] : []));
        /** Optional action displayed in the modal header. */
        this.headerActionLabel = input('', ...(ngDevMode ? [{ debugName: "headerActionLabel" }] : []));
        /**
         * Emits when modal is closed
         */
        this.closed = output();
        this.headerAction = output();
        effect(() => {
            const isOpen = this.show();
            if (isOpen) {
                document.documentElement.style.overflow = 'hidden';
                // Small delay to ensure DOM is ready before focus trap
                setTimeout(() => {
                    const modal = this.el.nativeElement.querySelector('[role="dialog"]');
                    if (modal) {
                        modal.focus();
                    }
                }, 0);
            }
            else {
                document.documentElement.style.overflow = '';
            }
        });
    }
    onKeydownEscape(event) {
        if (event.key === 'Escape' && this.closeOnEscape() && this.show()) {
            event.preventDefault();
            this.close();
        }
    }
    /**
     * Close the modal
     */
    close() {
        this.show.set(false);
        this.closed.emit();
    }
    /**
     * Handle backdrop click
     */
    onBackdropClick() {
        if (this.closeOnBackdropClick()) {
            this.close();
        }
    }
    /**
     * Handle dialog click (prevent backdrop close)
     */
    onDialogClick(event) {
        event.stopPropagation();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomModalComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomModalComponent, isStandalone: true, selector: "gom-lib-modal", inputs: { show: { classPropertyName: "show", publicName: "show", isSignal: true, isRequired: false, transformFunction: null }, title: { classPropertyName: "title", publicName: "title", isSignal: true, isRequired: false, transformFunction: null }, closeOnBackdropClick: { classPropertyName: "closeOnBackdropClick", publicName: "closeOnBackdropClick", isSignal: true, isRequired: false, transformFunction: null }, closeOnEscape: { classPropertyName: "closeOnEscape", publicName: "closeOnEscape", isSignal: true, isRequired: false, transformFunction: null }, showCloseButton: { classPropertyName: "showCloseButton", publicName: "showCloseButton", isSignal: true, isRequired: false, transformFunction: null }, size: { classPropertyName: "size", publicName: "size", isSignal: true, isRequired: false, transformFunction: null }, mobilePresentation: { classPropertyName: "mobilePresentation", publicName: "mobilePresentation", isSignal: true, isRequired: false, transformFunction: null }, headerActionLabel: { classPropertyName: "headerActionLabel", publicName: "headerActionLabel", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { show: "showChange", closed: "closed", headerAction: "headerAction" }, host: { listeners: { "document:keydown": "onKeydownEscape($event)" }, classAttribute: "gom-modal" }, ngImport: i0, template: "@if (show()) {\r\n  <div class=\"gom-modal__overlay\" (click)=\"onBackdropClick()\">\r\n    <div\r\n      class=\"gom-modal__dialog\"\r\n      [class.gom-modal__dialog--small]=\"size() === 'small'\"\r\n      [class.gom-modal__dialog--large]=\"size() === 'large'\"\r\n      [class.gom-modal__dialog--mobile-fullscreen]=\"mobilePresentation() === 'fullscreen'\"\r\n      [class.gom-modal__dialog--mobile-sheet]=\"mobilePresentation() === 'sheet'\"\r\n      role=\"dialog\"\r\n      aria-modal=\"true\"\r\n      tabindex=\"-1\"\r\n      (click)=\"onDialogClick($event)\"\r\n    >\r\n      @if (title()) {\r\n        <div class=\"gom-modal__header\">\r\n          <h2 class=\"gom-modal__title\">{{ title() }}</h2>\r\n          <div class=\"gom-modal__header-actions\">\r\n          @if (headerActionLabel()) {\r\n            <gom-lib-button\r\n              type=\"button\"\r\n              variant=\"secondary\"\r\n              class=\"gom-modal__header-action\"\r\n              (buttonClick)=\"headerAction.emit()\"\r\n            >{{ headerActionLabel() }}</gom-lib-button>\r\n          }\r\n          @if (showCloseButton()) {\r\n            <gom-lib-button\r\n              type=\"button\"\r\n              variant=\"secondary\"\r\n              size=\"icon\"\r\n              (buttonClick)=\"close()\"\r\n              class=\"gom-modal__close\"\r\n              aria-label=\"Close modal\"\r\n            >\r\n              <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n            </gom-lib-button>\r\n          }\r\n          </div>\r\n        </div>\r\n      }\r\n\r\n      <div class=\"gom-modal__content\">\r\n        <ng-content></ng-content>\r\n      </div>\r\n\r\n      <div class=\"gom-modal__footer\">\r\n        <ng-content select=\"[gom-modal-actions]\"></ng-content>\r\n      </div>\r\n    </div>\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-modal__overlay{position:fixed;inset:0;z-index:1000;background:#00000080;display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:fadeInOverlay .2s ease}.gom-modal__dialog{width:100%;max-width:700px;max-height:calc(100vh - 2rem);overflow:hidden;border-radius:1rem;background:#fff;border:.0625rem solid #d8d8d8;box-shadow:0 2rem 4rem #0000002e,0 .5rem 1rem #0000001f;display:grid;grid-template-rows:auto 1fr auto;gap:1rem;padding:2rem;animation:slideUpModalIn .25s cubic-bezier(.19,1,.22,1)}.gom-modal__dialog--small{max-width:450px}.gom-modal__dialog--large{max-width:900px}.gom-modal__dialog:focus{outline:none}@media(max-width:600px){.gom-modal__dialog{max-width:calc(100vw - 1.5rem);padding:1.5rem}}.gom-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:.0625rem solid #d8d8d8;padding-bottom:1.5rem}.gom-modal__title{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1.875rem;font-weight:700;line-height:1.2;margin:0;color:#0a5d8b}.gom-modal__header-actions{display:inline-flex;align-items:center;gap:.5rem}.gom-modal__header-action{color:#074161}.gom-modal__close{flex-shrink:0;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}.gom-modal__close i{font-size:1.25rem}.gom-modal__close:hover{background-color:#0000000a}.gom-modal__close:active{background-color:#00000014}.gom-modal__content{overflow-y:auto;overflow-x:hidden;min-height:200px}.gom-modal__content::-webkit-scrollbar{width:6px}.gom-modal__content::-webkit-scrollbar-track{background:transparent}.gom-modal__content::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}.gom-modal__content::-webkit-scrollbar-thumb:hover{background:#999}.gom-modal__footer{display:flex;justify-content:flex-end;gap:.5rem;border-top:.0625rem solid #d8d8d8;padding-top:1.5rem}.gom-modal__action-layout{width:100%;display:flex;align-items:center;justify-content:flex-end;gap:.75rem}.gom-modal__action-layout-start,.gom-modal__action-layout-end{display:inline-flex;align-items:center;gap:.5rem}.gom-modal__action-layout-start,.gom-modal__action-layout-end{justify-content:flex-end;flex:0 0 auto}@media(max-width:48rem){.gom-modal__overlay:has(.gom-modal__dialog--mobile-fullscreen){padding:0}.gom-modal__dialog--mobile-fullscreen{width:100vw;height:100dvh;max-width:none;max-height:none;border:0;border-radius:0;padding:0;gap:0}.gom-modal__dialog--mobile-fullscreen .gom-modal__header,.gom-modal__dialog--mobile-fullscreen .gom-modal__footer,.gom-modal__dialog--mobile-fullscreen .gom-modal__content{padding:1rem}.gom-modal__overlay:has(.gom-modal__dialog--mobile-sheet){align-items:flex-end;padding:0}.gom-modal__dialog--mobile-sheet{width:100vw;min-width:100vw;max-width:none;max-height:88dvh;box-sizing:border-box;flex:0 0 100vw;border-radius:1rem 1rem 0 0;padding:1rem;animation-name:slideUpSheetIn}.gom-modal__dialog--mobile-sheet:before{content:\"\";width:2.25rem;height:.25rem;margin:0 auto;border-radius:999px;background:#d8d8d8}.gom-modal__action-layout{align-items:center;justify-content:flex-end}.gom-modal__action-layout-start,.gom-modal__action-layout-end{flex-wrap:nowrap}}@keyframes slideUpSheetIn{0%{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeInOverlay{0%{opacity:0}to{opacity:1}}@keyframes slideUpModalIn{0%{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.gom-modal__overlay,.gom-modal__dialog{animation:none}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "component", type: GomButtonComponent, selector: "gom-lib-button", inputs: ["type", "variant", "size", "disabled", "ariaLabel", "ariaExpanded", "ariaHaspopup", "ariaCurrent", "buttonTitle", "ariaRole"], outputs: ["buttonClick"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomModalComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-modal', standalone: true, imports: [CommonModule, GomButtonComponent], changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, host: {
                        class: 'gom-modal',
                    }, template: "@if (show()) {\r\n  <div class=\"gom-modal__overlay\" (click)=\"onBackdropClick()\">\r\n    <div\r\n      class=\"gom-modal__dialog\"\r\n      [class.gom-modal__dialog--small]=\"size() === 'small'\"\r\n      [class.gom-modal__dialog--large]=\"size() === 'large'\"\r\n      [class.gom-modal__dialog--mobile-fullscreen]=\"mobilePresentation() === 'fullscreen'\"\r\n      [class.gom-modal__dialog--mobile-sheet]=\"mobilePresentation() === 'sheet'\"\r\n      role=\"dialog\"\r\n      aria-modal=\"true\"\r\n      tabindex=\"-1\"\r\n      (click)=\"onDialogClick($event)\"\r\n    >\r\n      @if (title()) {\r\n        <div class=\"gom-modal__header\">\r\n          <h2 class=\"gom-modal__title\">{{ title() }}</h2>\r\n          <div class=\"gom-modal__header-actions\">\r\n          @if (headerActionLabel()) {\r\n            <gom-lib-button\r\n              type=\"button\"\r\n              variant=\"secondary\"\r\n              class=\"gom-modal__header-action\"\r\n              (buttonClick)=\"headerAction.emit()\"\r\n            >{{ headerActionLabel() }}</gom-lib-button>\r\n          }\r\n          @if (showCloseButton()) {\r\n            <gom-lib-button\r\n              type=\"button\"\r\n              variant=\"secondary\"\r\n              size=\"icon\"\r\n              (buttonClick)=\"close()\"\r\n              class=\"gom-modal__close\"\r\n              aria-label=\"Close modal\"\r\n            >\r\n              <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n            </gom-lib-button>\r\n          }\r\n          </div>\r\n        </div>\r\n      }\r\n\r\n      <div class=\"gom-modal__content\">\r\n        <ng-content></ng-content>\r\n      </div>\r\n\r\n      <div class=\"gom-modal__footer\">\r\n        <ng-content select=\"[gom-modal-actions]\"></ng-content>\r\n      </div>\r\n    </div>\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-modal__overlay{position:fixed;inset:0;z-index:1000;background:#00000080;display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:fadeInOverlay .2s ease}.gom-modal__dialog{width:100%;max-width:700px;max-height:calc(100vh - 2rem);overflow:hidden;border-radius:1rem;background:#fff;border:.0625rem solid #d8d8d8;box-shadow:0 2rem 4rem #0000002e,0 .5rem 1rem #0000001f;display:grid;grid-template-rows:auto 1fr auto;gap:1rem;padding:2rem;animation:slideUpModalIn .25s cubic-bezier(.19,1,.22,1)}.gom-modal__dialog--small{max-width:450px}.gom-modal__dialog--large{max-width:900px}.gom-modal__dialog:focus{outline:none}@media(max-width:600px){.gom-modal__dialog{max-width:calc(100vw - 1.5rem);padding:1.5rem}}.gom-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:.0625rem solid #d8d8d8;padding-bottom:1.5rem}.gom-modal__title{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1.875rem;font-weight:700;line-height:1.2;margin:0;color:#0a5d8b}.gom-modal__header-actions{display:inline-flex;align-items:center;gap:.5rem}.gom-modal__header-action{color:#074161}.gom-modal__close{flex-shrink:0;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}.gom-modal__close i{font-size:1.25rem}.gom-modal__close:hover{background-color:#0000000a}.gom-modal__close:active{background-color:#00000014}.gom-modal__content{overflow-y:auto;overflow-x:hidden;min-height:200px}.gom-modal__content::-webkit-scrollbar{width:6px}.gom-modal__content::-webkit-scrollbar-track{background:transparent}.gom-modal__content::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}.gom-modal__content::-webkit-scrollbar-thumb:hover{background:#999}.gom-modal__footer{display:flex;justify-content:flex-end;gap:.5rem;border-top:.0625rem solid #d8d8d8;padding-top:1.5rem}.gom-modal__action-layout{width:100%;display:flex;align-items:center;justify-content:flex-end;gap:.75rem}.gom-modal__action-layout-start,.gom-modal__action-layout-end{display:inline-flex;align-items:center;gap:.5rem}.gom-modal__action-layout-start,.gom-modal__action-layout-end{justify-content:flex-end;flex:0 0 auto}@media(max-width:48rem){.gom-modal__overlay:has(.gom-modal__dialog--mobile-fullscreen){padding:0}.gom-modal__dialog--mobile-fullscreen{width:100vw;height:100dvh;max-width:none;max-height:none;border:0;border-radius:0;padding:0;gap:0}.gom-modal__dialog--mobile-fullscreen .gom-modal__header,.gom-modal__dialog--mobile-fullscreen .gom-modal__footer,.gom-modal__dialog--mobile-fullscreen .gom-modal__content{padding:1rem}.gom-modal__overlay:has(.gom-modal__dialog--mobile-sheet){align-items:flex-end;padding:0}.gom-modal__dialog--mobile-sheet{width:100vw;min-width:100vw;max-width:none;max-height:88dvh;box-sizing:border-box;flex:0 0 100vw;border-radius:1rem 1rem 0 0;padding:1rem;animation-name:slideUpSheetIn}.gom-modal__dialog--mobile-sheet:before{content:\"\";width:2.25rem;height:.25rem;margin:0 auto;border-radius:999px;background:#d8d8d8}.gom-modal__action-layout{align-items:center;justify-content:flex-end}.gom-modal__action-layout-start,.gom-modal__action-layout-end{flex-wrap:nowrap}}@keyframes slideUpSheetIn{0%{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeInOverlay{0%{opacity:0}to{opacity:1}}@keyframes slideUpModalIn{0%{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.gom-modal__overlay,.gom-modal__dialog{animation:none}}\n"] }]
        }], ctorParameters: () => [], propDecorators: { show: [{ type: i0.Input, args: [{ isSignal: true, alias: "show", required: false }] }, { type: i0.Output, args: ["showChange"] }], title: [{ type: i0.Input, args: [{ isSignal: true, alias: "title", required: false }] }], closeOnBackdropClick: [{ type: i0.Input, args: [{ isSignal: true, alias: "closeOnBackdropClick", required: false }] }], closeOnEscape: [{ type: i0.Input, args: [{ isSignal: true, alias: "closeOnEscape", required: false }] }], showCloseButton: [{ type: i0.Input, args: [{ isSignal: true, alias: "showCloseButton", required: false }] }], size: [{ type: i0.Input, args: [{ isSignal: true, alias: "size", required: false }] }], mobilePresentation: [{ type: i0.Input, args: [{ isSignal: true, alias: "mobilePresentation", required: false }] }], headerActionLabel: [{ type: i0.Input, args: [{ isSignal: true, alias: "headerActionLabel", required: false }] }], closed: [{ type: i0.Output, args: ["closed"] }], headerAction: [{ type: i0.Output, args: ["headerAction"] }], onKeydownEscape: [{
                type: HostListener,
                args: ['document:keydown', ['$event']]
            }] } });

// Global button content policy for multi-action areas (modal footers, card action sections).
// Change values here once to update behavior across modules.
const GOM_ACTION_BUTTON_POLICY = {
    primaryAction: 'icon-only',
    dangerAction: 'icon-only',
    secondaryAction: 'icon-only',
    dismissAction: 'text-only',
};
function getButtonContentMode(role) {
    switch (role) {
        case 'primary-action':
            return GOM_ACTION_BUTTON_POLICY.primaryAction;
        case 'danger-action':
            return GOM_ACTION_BUTTON_POLICY.dangerAction;
        case 'secondary-action':
            return GOM_ACTION_BUTTON_POLICY.secondaryAction;
        case 'dismiss':
            return GOM_ACTION_BUTTON_POLICY.dismissAction;
        default:
            return 'icon-text';
    }
}
function showButtonIcon(mode) {
    return mode === 'icon-only' || mode === 'icon-text';
}
function showButtonText(mode) {
    return mode === 'text-only' || mode === 'icon-text';
}

class GomConfirmationModalComponent {
    constructor() {
        this.show = model(false, ...(ngDevMode ? [{ debugName: "show" }] : []));
        this.title = input('Confirm Action', ...(ngDevMode ? [{ debugName: "title" }] : []));
        this.message = input('Are you sure you want to continue?', ...(ngDevMode ? [{ debugName: "message" }] : []));
        this.confirmText = input('Confirm', ...(ngDevMode ? [{ debugName: "confirmText" }] : []));
        this.cancelText = input('Cancel', ...(ngDevMode ? [{ debugName: "cancelText" }] : []));
        this.busy = input(false, ...(ngDevMode ? [{ debugName: "busy" }] : []));
        this.confirmVariant = input('danger', ...(ngDevMode ? [{ debugName: "confirmVariant" }] : []));
        this.confirmIconOnly = input(false, ...(ngDevMode ? [{ debugName: "confirmIconOnly" }] : []));
        this.confirmIcon = input('ri-check-line', ...(ngDevMode ? [{ debugName: "confirmIcon" }] : []));
        this.cancelIcon = input('ri-close-line', ...(ngDevMode ? [{ debugName: "cancelIcon" }] : []));
        this.confirmed = output();
        this.cancelled = output();
    }
    get cancelMode() {
        return getButtonContentMode('dismiss');
    }
    get confirmMode() {
        if (this.confirmIconOnly()) {
            return 'icon-only';
        }
        return this.confirmVariant() === 'danger'
            ? getButtonContentMode('danger-action')
            : getButtonContentMode('primary-action');
    }
    shouldShowIcon(mode) {
        return showButtonIcon(mode);
    }
    shouldShowText(mode) {
        return showButtonText(mode);
    }
    onConfirm() {
        this.confirmed.emit();
    }
    onCancel() {
        this.show.set(false);
        this.cancelled.emit();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomConfirmationModalComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomConfirmationModalComponent, isStandalone: true, selector: "gom-lib-confirmation-modal", inputs: { show: { classPropertyName: "show", publicName: "show", isSignal: true, isRequired: false, transformFunction: null }, title: { classPropertyName: "title", publicName: "title", isSignal: true, isRequired: false, transformFunction: null }, message: { classPropertyName: "message", publicName: "message", isSignal: true, isRequired: false, transformFunction: null }, confirmText: { classPropertyName: "confirmText", publicName: "confirmText", isSignal: true, isRequired: false, transformFunction: null }, cancelText: { classPropertyName: "cancelText", publicName: "cancelText", isSignal: true, isRequired: false, transformFunction: null }, busy: { classPropertyName: "busy", publicName: "busy", isSignal: true, isRequired: false, transformFunction: null }, confirmVariant: { classPropertyName: "confirmVariant", publicName: "confirmVariant", isSignal: true, isRequired: false, transformFunction: null }, confirmIconOnly: { classPropertyName: "confirmIconOnly", publicName: "confirmIconOnly", isSignal: true, isRequired: false, transformFunction: null }, confirmIcon: { classPropertyName: "confirmIcon", publicName: "confirmIcon", isSignal: true, isRequired: false, transformFunction: null }, cancelIcon: { classPropertyName: "cancelIcon", publicName: "cancelIcon", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { show: "showChange", confirmed: "confirmed", cancelled: "cancelled" }, ngImport: i0, template: "<gom-lib-modal\r\n  class=\"gom-confirmation-modal\"\r\n  [(show)]=\"show\"\r\n  [title]=\"title()\"\r\n  [size]=\"'small'\"\r\n  [closeOnBackdropClick]=\"true\"\r\n  (closed)=\"onCancel()\"\r\n>\r\n  <div class=\"gom-confirmation-modal__message\">\r\n    {{ message() }}\r\n  </div>\r\n\r\n  <footer class=\"gom-confirmation-modal__actions gom-modal__action-layout\" gom-modal-actions>\r\n    <div class=\"gom-modal__action-layout-start\">\r\n      <gom-lib-button\r\n        type=\"button\"\r\n        variant=\"secondary\"\r\n        [size]=\"cancelMode === 'icon-only' ? 'icon' : 'default'\"\r\n        (buttonClick)=\"onCancel()\"\r\n        [disabled]=\"busy()\"\r\n        [attr.aria-label]=\"cancelText()\"\r\n        [attr.title]=\"cancelText()\"\r\n      >\r\n        @if (shouldShowIcon(cancelMode)) {\r\n          <i [class]=\"cancelIcon()\" aria-hidden=\"true\"></i>\r\n        }\r\n        @if (shouldShowText(cancelMode)) {\r\n          {{ cancelText() }}\r\n        }\r\n      </gom-lib-button>\r\n    </div>\r\n\r\n    <div class=\"gom-modal__action-layout-end\">\r\n      <gom-lib-button\r\n        type=\"button\"\r\n        [size]=\"confirmMode === 'icon-only' ? 'icon' : 'default'\"\r\n        [variant]=\"confirmVariant()\"\r\n        (buttonClick)=\"onConfirm()\"\r\n        [disabled]=\"busy()\"\r\n        [attr.aria-label]=\"confirmText()\"\r\n        [attr.title]=\"confirmText()\"\r\n      >\r\n        @if (shouldShowIcon(confirmMode)) {\r\n          <i [class]=\"confirmIcon()\" aria-hidden=\"true\"></i>\r\n        }\r\n        @if (shouldShowText(confirmMode)) {\r\n          {{ confirmText() }}\r\n        }\r\n      </gom-lib-button>\r\n    </div>\r\n  </footer>\r\n</gom-lib-modal>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:contents}:host ::ng-deep .gom-confirmation-modal .gom-modal__dialog{max-width:34rem;gap:.75rem;padding:1.5rem}:host ::ng-deep .gom-confirmation-modal .gom-modal__content{min-height:auto;overflow:visible;padding:.25rem 0}:host ::ng-deep .gom-confirmation-modal .gom-modal__footer{padding-top:1rem}:host ::ng-deep .gom-confirmation-modal .gom-modal__footer gom-button{order:initial}.gom-confirmation-modal__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;color:#212121;margin:0;line-height:1.5}.gom-confirmation-modal__actions{display:inline-flex;align-items:center;justify-content:flex-end;width:100%;gap:.5rem}@media(max-width:37.5rem){:host ::ng-deep .gom-confirmation-modal .gom-modal__dialog{max-width:calc(100vw - 2rem)}.gom-confirmation-modal__actions{flex-direction:column-reverse;align-items:stretch}.gom-confirmation-modal__actions ::ng-deep gom-button{width:100%}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "component", type: GomModalComponent, selector: "gom-lib-modal", inputs: ["show", "title", "closeOnBackdropClick", "closeOnEscape", "showCloseButton", "size", "mobilePresentation", "headerActionLabel"], outputs: ["showChange", "closed", "headerAction"] }, { kind: "component", type: GomButtonComponent, selector: "gom-lib-button", inputs: ["type", "variant", "size", "disabled", "ariaLabel", "ariaExpanded", "ariaHaspopup", "ariaCurrent", "buttonTitle", "ariaRole"], outputs: ["buttonClick"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomConfirmationModalComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-confirmation-modal', standalone: true, imports: [CommonModule, GomModalComponent, GomButtonComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: "<gom-lib-modal\r\n  class=\"gom-confirmation-modal\"\r\n  [(show)]=\"show\"\r\n  [title]=\"title()\"\r\n  [size]=\"'small'\"\r\n  [closeOnBackdropClick]=\"true\"\r\n  (closed)=\"onCancel()\"\r\n>\r\n  <div class=\"gom-confirmation-modal__message\">\r\n    {{ message() }}\r\n  </div>\r\n\r\n  <footer class=\"gom-confirmation-modal__actions gom-modal__action-layout\" gom-modal-actions>\r\n    <div class=\"gom-modal__action-layout-start\">\r\n      <gom-lib-button\r\n        type=\"button\"\r\n        variant=\"secondary\"\r\n        [size]=\"cancelMode === 'icon-only' ? 'icon' : 'default'\"\r\n        (buttonClick)=\"onCancel()\"\r\n        [disabled]=\"busy()\"\r\n        [attr.aria-label]=\"cancelText()\"\r\n        [attr.title]=\"cancelText()\"\r\n      >\r\n        @if (shouldShowIcon(cancelMode)) {\r\n          <i [class]=\"cancelIcon()\" aria-hidden=\"true\"></i>\r\n        }\r\n        @if (shouldShowText(cancelMode)) {\r\n          {{ cancelText() }}\r\n        }\r\n      </gom-lib-button>\r\n    </div>\r\n\r\n    <div class=\"gom-modal__action-layout-end\">\r\n      <gom-lib-button\r\n        type=\"button\"\r\n        [size]=\"confirmMode === 'icon-only' ? 'icon' : 'default'\"\r\n        [variant]=\"confirmVariant()\"\r\n        (buttonClick)=\"onConfirm()\"\r\n        [disabled]=\"busy()\"\r\n        [attr.aria-label]=\"confirmText()\"\r\n        [attr.title]=\"confirmText()\"\r\n      >\r\n        @if (shouldShowIcon(confirmMode)) {\r\n          <i [class]=\"confirmIcon()\" aria-hidden=\"true\"></i>\r\n        }\r\n        @if (shouldShowText(confirmMode)) {\r\n          {{ confirmText() }}\r\n        }\r\n      </gom-lib-button>\r\n    </div>\r\n  </footer>\r\n</gom-lib-modal>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:contents}:host ::ng-deep .gom-confirmation-modal .gom-modal__dialog{max-width:34rem;gap:.75rem;padding:1.5rem}:host ::ng-deep .gom-confirmation-modal .gom-modal__content{min-height:auto;overflow:visible;padding:.25rem 0}:host ::ng-deep .gom-confirmation-modal .gom-modal__footer{padding-top:1rem}:host ::ng-deep .gom-confirmation-modal .gom-modal__footer gom-button{order:initial}.gom-confirmation-modal__message{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;color:#212121;margin:0;line-height:1.5}.gom-confirmation-modal__actions{display:inline-flex;align-items:center;justify-content:flex-end;width:100%;gap:.5rem}@media(max-width:37.5rem){:host ::ng-deep .gom-confirmation-modal .gom-modal__dialog{max-width:calc(100vw - 2rem)}.gom-confirmation-modal__actions{flex-direction:column-reverse;align-items:stretch}.gom-confirmation-modal__actions ::ng-deep gom-button{width:100%}}\n"] }]
        }], propDecorators: { show: [{ type: i0.Input, args: [{ isSignal: true, alias: "show", required: false }] }, { type: i0.Output, args: ["showChange"] }], title: [{ type: i0.Input, args: [{ isSignal: true, alias: "title", required: false }] }], message: [{ type: i0.Input, args: [{ isSignal: true, alias: "message", required: false }] }], confirmText: [{ type: i0.Input, args: [{ isSignal: true, alias: "confirmText", required: false }] }], cancelText: [{ type: i0.Input, args: [{ isSignal: true, alias: "cancelText", required: false }] }], busy: [{ type: i0.Input, args: [{ isSignal: true, alias: "busy", required: false }] }], confirmVariant: [{ type: i0.Input, args: [{ isSignal: true, alias: "confirmVariant", required: false }] }], confirmIconOnly: [{ type: i0.Input, args: [{ isSignal: true, alias: "confirmIconOnly", required: false }] }], confirmIcon: [{ type: i0.Input, args: [{ isSignal: true, alias: "confirmIcon", required: false }] }], cancelIcon: [{ type: i0.Input, args: [{ isSignal: true, alias: "cancelIcon", required: false }] }], confirmed: [{ type: i0.Output, args: ["confirmed"] }], cancelled: [{ type: i0.Output, args: ["cancelled"] }] } });

class MenuComponent {
    constructor() {
        this.menuList = input.required(...(ngDevMode ? [{ debugName: "menuList" }] : []));
        this.menuType = input('sidebar', ...(ngDevMode ? [{ debugName: "menuType" }] : []));
        this.outsideClickBoundary = input(null, ...(ngDevMode ? [{ debugName: "outsideClickBoundary" }] : []));
        this.showMenuListArrow = input(true, ...(ngDevMode ? [{ debugName: "showMenuListArrow" }] : []));
        this.showMobileBackArrow = input(true, ...(ngDevMode ? [{ debugName: "showMobileBackArrow" }] : []));
        this.mobileBackArrowIcon = input('ri-arrow-left-s-line', ...(ngDevMode ? [{ debugName: "mobileBackArrowIcon" }] : []));
        this.backButtonText = input('', ...(ngDevMode ? [{ debugName: "backButtonText" }] : []));
        this.showSideNavOpen = model(false, ...(ngDevMode ? [{ debugName: "showSideNavOpen" }] : []));
        this.elementRef = inject((ElementRef));
        this.lastOpenedAt = 0;
        this.updatedMenuList = computed(() => this.showSideNavOpen()
            ? {
                mainMenu: this.addSubMenuOpen(this.menuList().mainMenu),
                portalMenu: this.addSubMenuOpen(this.menuList().portalMenu),
            }
            : this.menuList(), ...(ngDevMode ? [{ debugName: "updatedMenuList" }] : []));
    }
    onKeydownHandler(_event) {
        if (this.showSideNavOpen()) {
            this.close();
        }
    }
    onDocumentClick(event) {
        if (!this.showSideNavOpen() || this.menuType() !== 'submenu') {
            return;
        }
        if (Date.now() - this.lastOpenedAt < 50) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }
        const hostElement = this.elementRef.nativeElement;
        const boundaryElement = this.outsideClickBoundary() ?? hostElement;
        if (!hostElement.contains(target) && !boundaryElement.contains(target)) {
            this.close();
        }
    }
    toggle() {
        if (this.showSideNavOpen()) {
            this.close();
            return;
        }
        this.lastOpenedAt = Date.now();
        this.showSideNavOpen.set(true);
    }
    close() {
        this.showSideNavOpen.set(false);
    }
    updateItem(menuArr, index) {
        return menuArr.map((item, i) => {
            if (index !== null) {
                if (i !== index) {
                    item.subMenuOpen = false;
                }
                else {
                    item.subMenuOpen = true;
                }
            }
            else {
                item.subMenuOpen = false;
            }
            return item;
        });
    }
    addSubMenuOpen(menu) {
        return menu.map((item) => {
            if (this.hasNestedMenu(item)) {
                item.subMenuOpen = false;
            }
            if ('submenu' in item && Array.isArray(item.submenu)) {
                this.addSubMenuOpen(item.submenu);
            }
            return item;
        });
    }
    hasNestedMenu(item) {
        return 'subMenuOpen' in item || 'submenu' in item;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: MenuComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: MenuComponent, isStandalone: true, selector: "core-lib-menu", inputs: { menuList: { classPropertyName: "menuList", publicName: "menuList", isSignal: true, isRequired: true, transformFunction: null }, menuType: { classPropertyName: "menuType", publicName: "menuType", isSignal: true, isRequired: false, transformFunction: null }, outsideClickBoundary: { classPropertyName: "outsideClickBoundary", publicName: "outsideClickBoundary", isSignal: true, isRequired: false, transformFunction: null }, showMenuListArrow: { classPropertyName: "showMenuListArrow", publicName: "showMenuListArrow", isSignal: true, isRequired: false, transformFunction: null }, showMobileBackArrow: { classPropertyName: "showMobileBackArrow", publicName: "showMobileBackArrow", isSignal: true, isRequired: false, transformFunction: null }, mobileBackArrowIcon: { classPropertyName: "mobileBackArrowIcon", publicName: "mobileBackArrowIcon", isSignal: true, isRequired: false, transformFunction: null }, backButtonText: { classPropertyName: "backButtonText", publicName: "backButtonText", isSignal: true, isRequired: false, transformFunction: null }, showSideNavOpen: { classPropertyName: "showSideNavOpen", publicName: "showSideNavOpen", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { showSideNavOpen: "showSideNavOpenChange" }, host: { listeners: { "document:keydown.escape": "onKeydownHandler($event)", "document:click": "onDocumentClick($event)" }, properties: { "class.submenu-host": "menuType() === \"submenu\"" } }, ngImport: i0, template: "<ng-template\r\n  #subMenu\r\n  let-item>\r\n  @let subMenuArr = [];\r\n  <div\r\n    role=\"menu\"\r\n    class=\"side-nav sub-nav open\"\r\n    [ngStyle]=\"{\r\n      '--item-level': item.level,\r\n    }\">\r\n    <ul class=\"main-menu\">\r\n      <button\r\n        tabindex=\"0\"\r\n        class=\"back-button\"\r\n        [attr.aria-label]=\"backButtonText()\"\r\n        (click)=\"\r\n          item.subMenuArray.splice(0, 1);\r\n          item.secNav = updateItem(item.previousNav, null)\r\n        \"\r\n        type=\"button\">\r\n        @if (showMobileBackArrow()) {\r\n          <em [class]=\"mobileBackArrowIcon()\"></em>\r\n        }\r\n        <span>{{ backButtonText() }}</span>\r\n      </button>\r\n      @for (menu of item.secNav; track $index; let idx = $index) {\r\n        @if (menu.submenu && menu.submenu.length > 0) {\r\n          <li>\r\n            <a\r\n              role=\"menuitem\"\r\n              tabindex=\"0\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"\r\n                subMenuArr.splice(0, 1);\r\n                subMenuArr.push(menu.submenu);\r\n                item.secNav = updateItem(item.secNav, idx)\r\n              \"\r\n              [class.selected]=\"menu.subMenuOpen\"\r\n              (keydown.enter)=\"\r\n                subMenuArr.splice(0, 1);\r\n                subMenuArr.push(menu.submenu);\r\n                item.secNav = updateItem(item.secNav, idx)\r\n              \">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n              <div>\r\n                @if (showMenuListArrow()) {\r\n                  <em class=\"ri-arrow-right-s-line\"></em>\r\n                }\r\n              </div>\r\n            </a>\r\n          </li>\r\n        } @else {\r\n          <li>\r\n            <a\r\n              role=\"menuitem\"\r\n              tabindex=\"0\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"menu.clickEvent(); showSideNavOpen.set(false)\"\r\n              (keydown.enter)=\"menu.clickEvent(); showSideNavOpen.set(false)\">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n            </a>\r\n          </li>\r\n        }\r\n      }\r\n    </ul>\r\n  </div>\r\n  @for (data of subMenuArr; track $index) {\r\n    <ng-container\r\n      *ngTemplateOutlet=\"\r\n        subMenu;\r\n        context: {\r\n          $implicit: {\r\n            secNav: data,\r\n            level: item.level + 1,\r\n            subMenuArray: subMenuArr,\r\n            previousNav: item.secNav,\r\n          },\r\n        }\r\n      \"></ng-container>\r\n  }\r\n</ng-template>\r\n\r\n@if (showSideNavOpen() && menuType() === 'submenu') {\r\n  <div\r\n    class=\"submenu-menu\"\r\n    role=\"menu\"\r\n    [attr.aria-label]=\"backButtonText() || 'submenu actions'\">\r\n    <ul class=\"submenu-menu__list\">\r\n      @for (menu of updatedMenuList().mainMenu; track $index) {\r\n        @if (menu.submenu && menu.submenu.length > 0) {\r\n          <li class=\"submenu-menu__group\">\r\n            <div class=\"submenu-menu__group-title\">\r\n              <em [class]=\"menu.icon\"></em>\r\n              <span>{{ menu.title }}</span>\r\n            </div>\r\n\r\n            <ul class=\"submenu-menu__children\">\r\n              @for (subMenuItem of menu.submenu; track $index) {\r\n                <li>\r\n                  <button\r\n                    type=\"button\"\r\n                    class=\"submenu-menu__item\"\r\n                    [attr.aria-label]=\"subMenuItem.title\"\r\n                    (click)=\"subMenuItem.clickEvent?.($event); showSideNavOpen.set(false)\">\r\n                    <div>\r\n                      <em [class]=\"subMenuItem.icon\"></em>\r\n                      <span>{{ subMenuItem.title }}</span>\r\n                    </div>\r\n                  </button>\r\n                </li>\r\n              }\r\n            </ul>\r\n          </li>\r\n        } @else {\r\n          <li>\r\n            <button\r\n              type=\"button\"\r\n              class=\"submenu-menu__item\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"menu.clickEvent?.($event); showSideNavOpen.set(false)\">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n            </button>\r\n          </li>\r\n        }\r\n      }\r\n    </ul>\r\n  </div>\r\n} @else if (showSideNavOpen()) {\r\n  <div\r\n    class=\"side-nav-overlay\"\r\n    (click)=\"toggle()\"\r\n    (keydown.enter)=\"toggle()\"\r\n    aria-hidden=\"true\"></div>\r\n  <nav\r\n    class=\"side-nav-container\"\r\n    [class.open]=\"showSideNavOpen()\">\r\n    @let subMenuArr = [];\r\n    @let level = 0;\r\n    <div\r\n      role=\"menu\"\r\n      class=\"side-nav\"\r\n      [ngStyle]=\"{\r\n        '--item-level': level,\r\n      }\">\r\n      <ul class=\"main-menu\">\r\n        <button\r\n          tabindex=\"0\"\r\n          [attr.aria-label]=\"backButtonText()\"\r\n          class=\"back-button\"\r\n          (click)=\"toggle()\"\r\n          type=\"button\">\r\n          @if (showMobileBackArrow()) {\r\n            <em [class]=\"mobileBackArrowIcon()\"></em>\r\n          }\r\n          <span>{{ backButtonText() }}</span>\r\n        </button>\r\n        @for (\r\n          menu of updatedMenuList().mainMenu;\r\n          track $index;\r\n          let idx = $index\r\n        ) {\r\n          @if (menu.submenu && menu.submenu.length > 0) {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"menu.title\"\r\n                [attr.aria-expanded]=\"menu.subMenuOpen ? 'true' : 'false'\"\r\n                (click)=\"\r\n                  subMenuArr.splice(0, 1);\r\n                  subMenuArr.push(menu.submenu);\r\n                  updatedMenuList().mainMenu = updateItem(\r\n                    updatedMenuList().mainMenu,\r\n                    idx\r\n                  )\r\n                \"\r\n                (keydown.enter)=\"\r\n                  subMenuArr.splice(0, 1);\r\n                  subMenuArr.push(menu.submenu);\r\n                  updatedMenuList().mainMenu = updateItem(\r\n                    updatedMenuList().mainMenu,\r\n                    idx\r\n                  )\r\n                \"\r\n                [class.selected]=\"menu.subMenuOpen\">\r\n                <div>\r\n                  <em [class]=\"menu.icon\"></em>\r\n                  <span>{{ menu.title }}</span>\r\n                </div>\r\n                <div>\r\n                  @if (showMenuListArrow()) {\r\n                    <em class=\"ri-arrow-right-s-line\"></em>\r\n                  }\r\n                </div>\r\n              </a>\r\n            </li>\r\n          } @else {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"menu.title\"\r\n                (click)=\"menu.clickEvent($event); showSideNavOpen.set(false)\"\r\n                (keydown.enter)=\"\r\n                  menu.clickEvent($event); showSideNavOpen.set(false)\r\n                \">\r\n                <div>\r\n                  <em [class]=\"menu.icon\"></em>\r\n                  <span>{{ menu.title }}</span>\r\n                </div>\r\n              </a>\r\n            </li>\r\n          }\r\n        }\r\n      </ul>\r\n      @if (updatedMenuList().portalMenu.length) {\r\n        <ul class=\"portal-menu\">\r\n          @for (\r\n            portalMenu of updatedMenuList().portalMenu;\r\n            track $index;\r\n            let idx = $index\r\n          ) {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"portalMenu.title\"\r\n                (click)=\"\r\n                  portalMenu.clickEvent($event); showSideNavOpen.set(false)\r\n                \"\r\n                (keydown.enter)=\"\r\n                  portalMenu.clickEvent($event); showSideNavOpen.set(false)\r\n                \">\r\n                <div>\r\n                  <img\r\n                    [src]=\"portalMenu.icon\"\r\n                    alt=\"portal-icon\" />\r\n                  <span>{{ portalMenu.title }}</span>\r\n                </div>\r\n              </a>\r\n            </li>\r\n          }\r\n        </ul>\r\n      }\r\n    </div>\r\n    @for (data of subMenuArr; track $index) {\r\n      <ng-container\r\n        *ngTemplateOutlet=\"\r\n          subMenu;\r\n          context: {\r\n            $implicit: {\r\n              secNav: data,\r\n              level: level + 1,\r\n              subMenuArray: subMenuArr,\r\n              previousNav: updatedMenuList().mainMenu,\r\n            },\r\n          }\r\n        \"></ng-container>\r\n    }\r\n  </nav>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{position:relative;display:inline-block}:host(.submenu-host){position:absolute;top:calc(100% + .25rem);right:0;display:block;z-index:120}.submenu-menu{position:relative;top:auto;right:auto;min-width:13rem;max-width:20rem;border:.0625rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 10px 24px #0f172a26;overflow:hidden}.submenu-menu__list,.submenu-menu__children{list-style:none;margin:0;padding:0}.submenu-menu__group{border-top:.0625rem solid #e9e9e9}.submenu-menu__group:first-child{border-top:0}.submenu-menu__group-title{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.submenu-menu__group-title em{font-size:1rem}.submenu-menu__group-title span{font-weight:600}.submenu-menu__item{width:100%;border:0;background:transparent;text-align:left;cursor:pointer;padding:.5rem 1rem}.submenu-menu__item div{display:flex;align-items:center;gap:.75rem}.submenu-menu__item em{font-size:1.125rem;color:#58595b}.submenu-menu__item span{color:#212121;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.submenu-menu__item:hover,.submenu-menu__item:focus-visible{outline:none;background:#f6f6f6}.side-nav-overlay{position:fixed;width:100%;height:100%;inset:0;z-index:90}@media only screen and (max-width:1056px){.side-nav-overlay{display:none}}.side-nav{display:flex;flex-direction:column;height:100dvh;background-color:#fff;width:22rem;z-index:calc(99 - var(--item-level));box-shadow:0 10px 24px #0f172a26}@media only screen and (max-width:1056px){.side-nav{position:fixed;width:100vw;z-index:calc(99 + var(--item-level))}}.side-nav .main-menu{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:.75rem}.side-nav .portal-menu{display:flex;flex:0 0 auto;border-top:.0625rem dashed #d8d8d8;list-style-type:none;padding:1.5rem;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:.75rem;align-self:stretch}.side-nav .portal-menu li{padding:0;width:100%}.side-nav .portal-menu li a{display:flex;gap:1rem;align-self:stretch;padding:0;justify-content:start}.side-nav .portal-menu li a img{width:2.5rem;height:2.5rem}.side-nav .portal-menu li a span{color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.side-nav .portal-menu li:focus-within,.side-nav .portal-menu li:hover{background-color:#0a5d8b;color:#fff;cursor:pointer}.side-nav .portal-menu li:focus-within div em,.side-nav .portal-menu li:focus-within div span,.side-nav .portal-menu li:hover div em,.side-nav .portal-menu li:hover div span{color:#fff}.side-nav ul{list-style-type:none;margin:0;padding:0;padding-top:1rem;overflow-y:auto}.side-nav ul a{padding:1rem}.side-nav ul a.selected{background-color:#0a5d8b;color:#fff}.side-nav ul a.selected div em,.side-nav ul a.selected div span{color:#fff}.side-nav ul a div{display:flex;justify-content:start;align-items:center;gap:.75rem}.side-nav ul a div em{color:#58595b;font-size:1.25rem}.side-nav ul a div span{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.side-nav.sub-nav{background-color:#f6f6f6;box-shadow:0 10px 24px #0f172a26}.side-nav.sub-nav ul{padding-top:0}.side-nav .back-button{display:none}@media only screen and (max-width:1056px){.side-nav .back-button{background-color:#fff;display:flex;padding:1.5rem;align-items:center;gap:1rem;color:#212121;cursor:pointer;border:0;width:100%;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.side-nav .back-button em{font-size:1.25rem;color:#58595b}}.side-nav-container{position:fixed;top:0;left:0;display:none;z-index:100}.side-nav-container.open{display:flex}@media only screen and (max-width:1056px){.side-nav-container{width:100vw;height:100dvh}}.side-nav ul li a{text-decoration:none;color:#212121;font-size:1.125rem;display:flex;justify-content:space-between;align-items:center}.side-nav ul li:focus-within,.side-nav ul li:hover{background-color:#0a5d8b;color:#fff;cursor:pointer}.side-nav ul li:focus-within div em,.side-nav ul li:focus-within div span,.side-nav ul li:hover div em,.side-nav ul li:hover div span{color:#fff}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }, { kind: "directive", type: i1.NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: MenuComponent, decorators: [{
            type: Component,
            args: [{ selector: 'core-lib-menu', standalone: true, host: {
                        '[class.submenu-host]': 'menuType() === "submenu"',
                    }, imports: [CommonModule], template: "<ng-template\r\n  #subMenu\r\n  let-item>\r\n  @let subMenuArr = [];\r\n  <div\r\n    role=\"menu\"\r\n    class=\"side-nav sub-nav open\"\r\n    [ngStyle]=\"{\r\n      '--item-level': item.level,\r\n    }\">\r\n    <ul class=\"main-menu\">\r\n      <button\r\n        tabindex=\"0\"\r\n        class=\"back-button\"\r\n        [attr.aria-label]=\"backButtonText()\"\r\n        (click)=\"\r\n          item.subMenuArray.splice(0, 1);\r\n          item.secNav = updateItem(item.previousNav, null)\r\n        \"\r\n        type=\"button\">\r\n        @if (showMobileBackArrow()) {\r\n          <em [class]=\"mobileBackArrowIcon()\"></em>\r\n        }\r\n        <span>{{ backButtonText() }}</span>\r\n      </button>\r\n      @for (menu of item.secNav; track $index; let idx = $index) {\r\n        @if (menu.submenu && menu.submenu.length > 0) {\r\n          <li>\r\n            <a\r\n              role=\"menuitem\"\r\n              tabindex=\"0\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"\r\n                subMenuArr.splice(0, 1);\r\n                subMenuArr.push(menu.submenu);\r\n                item.secNav = updateItem(item.secNav, idx)\r\n              \"\r\n              [class.selected]=\"menu.subMenuOpen\"\r\n              (keydown.enter)=\"\r\n                subMenuArr.splice(0, 1);\r\n                subMenuArr.push(menu.submenu);\r\n                item.secNav = updateItem(item.secNav, idx)\r\n              \">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n              <div>\r\n                @if (showMenuListArrow()) {\r\n                  <em class=\"ri-arrow-right-s-line\"></em>\r\n                }\r\n              </div>\r\n            </a>\r\n          </li>\r\n        } @else {\r\n          <li>\r\n            <a\r\n              role=\"menuitem\"\r\n              tabindex=\"0\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"menu.clickEvent(); showSideNavOpen.set(false)\"\r\n              (keydown.enter)=\"menu.clickEvent(); showSideNavOpen.set(false)\">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n            </a>\r\n          </li>\r\n        }\r\n      }\r\n    </ul>\r\n  </div>\r\n  @for (data of subMenuArr; track $index) {\r\n    <ng-container\r\n      *ngTemplateOutlet=\"\r\n        subMenu;\r\n        context: {\r\n          $implicit: {\r\n            secNav: data,\r\n            level: item.level + 1,\r\n            subMenuArray: subMenuArr,\r\n            previousNav: item.secNav,\r\n          },\r\n        }\r\n      \"></ng-container>\r\n  }\r\n</ng-template>\r\n\r\n@if (showSideNavOpen() && menuType() === 'submenu') {\r\n  <div\r\n    class=\"submenu-menu\"\r\n    role=\"menu\"\r\n    [attr.aria-label]=\"backButtonText() || 'submenu actions'\">\r\n    <ul class=\"submenu-menu__list\">\r\n      @for (menu of updatedMenuList().mainMenu; track $index) {\r\n        @if (menu.submenu && menu.submenu.length > 0) {\r\n          <li class=\"submenu-menu__group\">\r\n            <div class=\"submenu-menu__group-title\">\r\n              <em [class]=\"menu.icon\"></em>\r\n              <span>{{ menu.title }}</span>\r\n            </div>\r\n\r\n            <ul class=\"submenu-menu__children\">\r\n              @for (subMenuItem of menu.submenu; track $index) {\r\n                <li>\r\n                  <button\r\n                    type=\"button\"\r\n                    class=\"submenu-menu__item\"\r\n                    [attr.aria-label]=\"subMenuItem.title\"\r\n                    (click)=\"subMenuItem.clickEvent?.($event); showSideNavOpen.set(false)\">\r\n                    <div>\r\n                      <em [class]=\"subMenuItem.icon\"></em>\r\n                      <span>{{ subMenuItem.title }}</span>\r\n                    </div>\r\n                  </button>\r\n                </li>\r\n              }\r\n            </ul>\r\n          </li>\r\n        } @else {\r\n          <li>\r\n            <button\r\n              type=\"button\"\r\n              class=\"submenu-menu__item\"\r\n              [attr.aria-label]=\"menu.title\"\r\n              (click)=\"menu.clickEvent?.($event); showSideNavOpen.set(false)\">\r\n              <div>\r\n                <em [class]=\"menu.icon\"></em>\r\n                <span>{{ menu.title }}</span>\r\n              </div>\r\n            </button>\r\n          </li>\r\n        }\r\n      }\r\n    </ul>\r\n  </div>\r\n} @else if (showSideNavOpen()) {\r\n  <div\r\n    class=\"side-nav-overlay\"\r\n    (click)=\"toggle()\"\r\n    (keydown.enter)=\"toggle()\"\r\n    aria-hidden=\"true\"></div>\r\n  <nav\r\n    class=\"side-nav-container\"\r\n    [class.open]=\"showSideNavOpen()\">\r\n    @let subMenuArr = [];\r\n    @let level = 0;\r\n    <div\r\n      role=\"menu\"\r\n      class=\"side-nav\"\r\n      [ngStyle]=\"{\r\n        '--item-level': level,\r\n      }\">\r\n      <ul class=\"main-menu\">\r\n        <button\r\n          tabindex=\"0\"\r\n          [attr.aria-label]=\"backButtonText()\"\r\n          class=\"back-button\"\r\n          (click)=\"toggle()\"\r\n          type=\"button\">\r\n          @if (showMobileBackArrow()) {\r\n            <em [class]=\"mobileBackArrowIcon()\"></em>\r\n          }\r\n          <span>{{ backButtonText() }}</span>\r\n        </button>\r\n        @for (\r\n          menu of updatedMenuList().mainMenu;\r\n          track $index;\r\n          let idx = $index\r\n        ) {\r\n          @if (menu.submenu && menu.submenu.length > 0) {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"menu.title\"\r\n                [attr.aria-expanded]=\"menu.subMenuOpen ? 'true' : 'false'\"\r\n                (click)=\"\r\n                  subMenuArr.splice(0, 1);\r\n                  subMenuArr.push(menu.submenu);\r\n                  updatedMenuList().mainMenu = updateItem(\r\n                    updatedMenuList().mainMenu,\r\n                    idx\r\n                  )\r\n                \"\r\n                (keydown.enter)=\"\r\n                  subMenuArr.splice(0, 1);\r\n                  subMenuArr.push(menu.submenu);\r\n                  updatedMenuList().mainMenu = updateItem(\r\n                    updatedMenuList().mainMenu,\r\n                    idx\r\n                  )\r\n                \"\r\n                [class.selected]=\"menu.subMenuOpen\">\r\n                <div>\r\n                  <em [class]=\"menu.icon\"></em>\r\n                  <span>{{ menu.title }}</span>\r\n                </div>\r\n                <div>\r\n                  @if (showMenuListArrow()) {\r\n                    <em class=\"ri-arrow-right-s-line\"></em>\r\n                  }\r\n                </div>\r\n              </a>\r\n            </li>\r\n          } @else {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"menu.title\"\r\n                (click)=\"menu.clickEvent($event); showSideNavOpen.set(false)\"\r\n                (keydown.enter)=\"\r\n                  menu.clickEvent($event); showSideNavOpen.set(false)\r\n                \">\r\n                <div>\r\n                  <em [class]=\"menu.icon\"></em>\r\n                  <span>{{ menu.title }}</span>\r\n                </div>\r\n              </a>\r\n            </li>\r\n          }\r\n        }\r\n      </ul>\r\n      @if (updatedMenuList().portalMenu.length) {\r\n        <ul class=\"portal-menu\">\r\n          @for (\r\n            portalMenu of updatedMenuList().portalMenu;\r\n            track $index;\r\n            let idx = $index\r\n          ) {\r\n            <li>\r\n              <a\r\n                role=\"menuitem\"\r\n                tabindex=\"0\"\r\n                [attr.aria-label]=\"portalMenu.title\"\r\n                (click)=\"\r\n                  portalMenu.clickEvent($event); showSideNavOpen.set(false)\r\n                \"\r\n                (keydown.enter)=\"\r\n                  portalMenu.clickEvent($event); showSideNavOpen.set(false)\r\n                \">\r\n                <div>\r\n                  <img\r\n                    [src]=\"portalMenu.icon\"\r\n                    alt=\"portal-icon\" />\r\n                  <span>{{ portalMenu.title }}</span>\r\n                </div>\r\n              </a>\r\n            </li>\r\n          }\r\n        </ul>\r\n      }\r\n    </div>\r\n    @for (data of subMenuArr; track $index) {\r\n      <ng-container\r\n        *ngTemplateOutlet=\"\r\n          subMenu;\r\n          context: {\r\n            $implicit: {\r\n              secNav: data,\r\n              level: level + 1,\r\n              subMenuArray: subMenuArr,\r\n              previousNav: updatedMenuList().mainMenu,\r\n            },\r\n          }\r\n        \"></ng-container>\r\n    }\r\n  </nav>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{position:relative;display:inline-block}:host(.submenu-host){position:absolute;top:calc(100% + .25rem);right:0;display:block;z-index:120}.submenu-menu{position:relative;top:auto;right:auto;min-width:13rem;max-width:20rem;border:.0625rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 10px 24px #0f172a26;overflow:hidden}.submenu-menu__list,.submenu-menu__children{list-style:none;margin:0;padding:0}.submenu-menu__group{border-top:.0625rem solid #e9e9e9}.submenu-menu__group:first-child{border-top:0}.submenu-menu__group-title{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.submenu-menu__group-title em{font-size:1rem}.submenu-menu__group-title span{font-weight:600}.submenu-menu__item{width:100%;border:0;background:transparent;text-align:left;cursor:pointer;padding:.5rem 1rem}.submenu-menu__item div{display:flex;align-items:center;gap:.75rem}.submenu-menu__item em{font-size:1.125rem;color:#58595b}.submenu-menu__item span{color:#212121;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.submenu-menu__item:hover,.submenu-menu__item:focus-visible{outline:none;background:#f6f6f6}.side-nav-overlay{position:fixed;width:100%;height:100%;inset:0;z-index:90}@media only screen and (max-width:1056px){.side-nav-overlay{display:none}}.side-nav{display:flex;flex-direction:column;height:100dvh;background-color:#fff;width:22rem;z-index:calc(99 - var(--item-level));box-shadow:0 10px 24px #0f172a26}@media only screen and (max-width:1056px){.side-nav{position:fixed;width:100vw;z-index:calc(99 + var(--item-level))}}.side-nav .main-menu{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:.75rem}.side-nav .portal-menu{display:flex;flex:0 0 auto;border-top:.0625rem dashed #d8d8d8;list-style-type:none;padding:1.5rem;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:.75rem;align-self:stretch}.side-nav .portal-menu li{padding:0;width:100%}.side-nav .portal-menu li a{display:flex;gap:1rem;align-self:stretch;padding:0;justify-content:start}.side-nav .portal-menu li a img{width:2.5rem;height:2.5rem}.side-nav .portal-menu li a span{color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.side-nav .portal-menu li:focus-within,.side-nav .portal-menu li:hover{background-color:#0a5d8b;color:#fff;cursor:pointer}.side-nav .portal-menu li:focus-within div em,.side-nav .portal-menu li:focus-within div span,.side-nav .portal-menu li:hover div em,.side-nav .portal-menu li:hover div span{color:#fff}.side-nav ul{list-style-type:none;margin:0;padding:0;padding-top:1rem;overflow-y:auto}.side-nav ul a{padding:1rem}.side-nav ul a.selected{background-color:#0a5d8b;color:#fff}.side-nav ul a.selected div em,.side-nav ul a.selected div span{color:#fff}.side-nav ul a div{display:flex;justify-content:start;align-items:center;gap:.75rem}.side-nav ul a div em{color:#58595b;font-size:1.25rem}.side-nav ul a div span{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.side-nav.sub-nav{background-color:#f6f6f6;box-shadow:0 10px 24px #0f172a26}.side-nav.sub-nav ul{padding-top:0}.side-nav .back-button{display:none}@media only screen and (max-width:1056px){.side-nav .back-button{background-color:#fff;display:flex;padding:1.5rem;align-items:center;gap:1rem;color:#212121;cursor:pointer;border:0;width:100%;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5}.side-nav .back-button em{font-size:1.25rem;color:#58595b}}.side-nav-container{position:fixed;top:0;left:0;display:none;z-index:100}.side-nav-container.open{display:flex}@media only screen and (max-width:1056px){.side-nav-container{width:100vw;height:100dvh}}.side-nav ul li a{text-decoration:none;color:#212121;font-size:1.125rem;display:flex;justify-content:space-between;align-items:center}.side-nav ul li:focus-within,.side-nav ul li:hover{background-color:#0a5d8b;color:#fff;cursor:pointer}.side-nav ul li:focus-within div em,.side-nav ul li:focus-within div span,.side-nav ul li:hover div em,.side-nav ul li:hover div span{color:#fff}\n"] }]
        }], propDecorators: { menuList: [{ type: i0.Input, args: [{ isSignal: true, alias: "menuList", required: true }] }], menuType: [{ type: i0.Input, args: [{ isSignal: true, alias: "menuType", required: false }] }], outsideClickBoundary: [{ type: i0.Input, args: [{ isSignal: true, alias: "outsideClickBoundary", required: false }] }], showMenuListArrow: [{ type: i0.Input, args: [{ isSignal: true, alias: "showMenuListArrow", required: false }] }], showMobileBackArrow: [{ type: i0.Input, args: [{ isSignal: true, alias: "showMobileBackArrow", required: false }] }], mobileBackArrowIcon: [{ type: i0.Input, args: [{ isSignal: true, alias: "mobileBackArrowIcon", required: false }] }], backButtonText: [{ type: i0.Input, args: [{ isSignal: true, alias: "backButtonText", required: false }] }], showSideNavOpen: [{ type: i0.Input, args: [{ isSignal: true, alias: "showSideNavOpen", required: false }] }, { type: i0.Output, args: ["showSideNavOpenChange"] }], onKeydownHandler: [{
                type: HostListener,
                args: ['document:keydown.escape', ['$event']]
            }], onDocumentClick: [{
                type: HostListener,
                args: ['document:click', ['$event']]
            }] } });

class MenuModule {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: MenuModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.19", ngImport: i0, type: MenuModule, imports: [CommonModule, MenuComponent], exports: [MenuComponent] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: MenuModule, imports: [CommonModule, MenuComponent] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: MenuModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [],
                    imports: [CommonModule, MenuComponent],
                    exports: [MenuComponent],
                }]
        }] });

class GomTableService {
    runClientPipeline(rows, columns, query, advancedFilterDefinitions = []) {
        const searched = this.applySearch(rows, columns, query.searchTerm, query.visibleColumnKeys, query.globalSearchScope ?? 'visible');
        const filtered = this.applyFilters(searched, query.filters);
        const advancedFiltered = this.applyAdvancedFilters(filtered, advancedFilterDefinitions, query.advancedFilters ?? {});
        const sorted = this.applySort(advancedFiltered, columns, query.sort);
        const paged = this.applyPagination(sorted, query.pageIndex, query.pageSize);
        return {
            rows: paged,
            filteredTotal: sorted.length,
        };
    }
    applySearch(rows, columns, searchTerm, visibleColumnKeys, scope) {
        const normalized = searchTerm.trim().toLowerCase();
        if (!normalized) {
            return rows;
        }
        const activeColumns = columns.filter((column) => !column.actionButtons?.length
            && column.searchable !== false
            && (scope === 'all' || visibleColumnKeys.includes(column.key)));
        return rows.filter((row) => activeColumns.some((column) => {
            const value = column.searchValue ? column.searchValue(row) : row[column.key];
            return this.stringifyCellValue(value).toLowerCase().includes(normalized);
        }));
    }
    applyAdvancedFilters(rows, definitions, values) {
        const activeDefinitions = definitions.filter((definition) => this.hasFilterValue(values[definition.key]));
        if (!activeDefinitions.length) {
            return rows;
        }
        return rows.filter((row) => activeDefinitions.every((definition) => {
            const filterValue = values[definition.key];
            const rawValue = definition.valueAccessor ? definition.valueAccessor(row) : row[definition.key];
            return this.matchesAdvancedFilter(rawValue, filterValue, definition.type);
        }));
    }
    matchesAdvancedFilter(rawValue, filterValue, type) {
        const cellText = this.stringifyCellValue(rawValue).trim().toLowerCase();
        if (type === 'multi-select') {
            if (Array.isArray(filterValue)) {
                return filterValue.some((value) => value.toLowerCase() === cellText);
            }
            if (typeof filterValue === 'string') {
                return cellText === filterValue.trim().toLowerCase();
            }
            return false;
        }
        if (type === 'date-range' && !Array.isArray(filterValue) && typeof filterValue === 'object') {
            const comparable = this.toDateComparable(rawValue);
            if (!comparable) {
                return false;
            }
            return (!filterValue.from || comparable >= filterValue.from)
                && (!filterValue.to || comparable <= filterValue.to);
        }
        if (typeof filterValue !== 'string') {
            return true;
        }
        const normalizedFilter = filterValue.trim().toLowerCase();
        return type === 'text'
            ? cellText.includes(normalizedFilter)
            : cellText === normalizedFilter;
    }
    hasFilterValue(value) {
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return !!value && (!!value.from || !!value.to);
    }
    toDateComparable(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value !== 'string' && typeof value !== 'number') {
            return '';
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    }
    applyFilters(rows, filters) {
        const filterEntries = Object.entries(filters).filter(([, value]) => value.trim() !== '');
        if (!filterEntries.length) {
            return rows;
        }
        return rows.filter((row) => filterEntries.every(([key, filterValue]) => {
            const cellText = this.stringifyCellValue(row[key]).toLowerCase();
            return cellText.includes(filterValue.trim().toLowerCase());
        }));
    }
    applySort(rows, columns, sort) {
        if (!sort.key || !sort.direction) {
            return rows;
        }
        const directionFactor = sort.direction === 'asc' ? 1 : -1;
        const column = columns.find((item) => item.key === sort.key);
        return [...rows].sort((first, second) => {
            const firstValue = column?.sortValue ? column.sortValue(first) : first[sort.key];
            const secondValue = column?.sortValue ? column.sortValue(second) : second[sort.key];
            const firstNumeric = Number(firstValue);
            const secondNumeric = Number(secondValue);
            const bothNumeric = Number.isFinite(firstNumeric) && Number.isFinite(secondNumeric);
            if (bothNumeric) {
                return (firstNumeric - secondNumeric) * directionFactor;
            }
            const firstText = this.stringifyCellValue(firstValue).toLowerCase();
            const secondText = this.stringifyCellValue(secondValue).toLowerCase();
            if (firstText < secondText) {
                return -1 * directionFactor;
            }
            if (firstText > secondText) {
                return 1 * directionFactor;
            }
            return 0;
        });
    }
    applyPagination(rows, pageIndex, pageSize) {
        const start = pageIndex * pageSize;
        return rows.slice(start, start + pageSize);
    }
    stringifyCellValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return JSON.stringify(value);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTableService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTableService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTableService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });

class GomTableComponent {
    constructor() {
        this.columns = [];
        this.rows = [];
        this.loading = false;
        this.dataMode = 'client';
        this.totalItems = 0;
        this.pageSize = 10;
        this.pageIndex = 0;
        this.pageSizeOptions = [5, 10, 20, 50, 100];
        this.showPagination = true;
        this.searchPlaceholder = 'Search...';
        this.emptyMessage = 'No records found.';
        this.mobileCardView = false;
        this.mobileCardFields = [];
        this.mobileSortKeys = [];
        this.mobileCardClickable = false;
        this.mobileCardConfig = null;
        this.mobilePaginationMode = 'pages';
        this.mobileAutoLoadMore = false;
        this.mobileLoadMoreStrategy = 'emit';
        this.bodyViewportRows = null;
        this.enableRowSelection = false;
        this.bulkActions = [];
        this.bulkActionBusyKey = null;
        this.selectionItemLabel = 'row';
        this.showSearch = true;
        this.globalSearchScope = 'visible';
        this.searchDebounceMs = 300;
        this.showFilterButton = true;
        this.showClearFilterButton = false;
        this.advancedFilterDefinitions = [];
        this.filterNavigationRows = [];
        this.enableColumnSearch = true;
        this.showColumnSearchInitially = false;
        this.enableColumnVisibility = true;
        this.showExport = false;
        this.showInlineEditBanner = false;
        this.inlineEditBannerCount = 0;
        this.inlineEditBannerSummary = 'You have unsaved changes';
        this.inlineEditBannerDetail = '';
        this.inlineEditBannerSaveLabel = 'Save All';
        this.inlineEditBannerDiscardLabel = 'Discard All';
        this.inlineEditBannerReviewLabel = 'Review Changes';
        this.inlineEditBannerSaving = false;
        this.queryChange = new EventEmitter();
        this.pageChange = new EventEmitter();
        this.sortChange = new EventEmitter();
        this.filterChange = new EventEmitter();
        this.filterNavigationChange = new EventEmitter();
        this.columnVisibilityChange = new EventEmitter();
        this.rowAction = new EventEmitter();
        this.cellEdit = new EventEmitter();
        this.rowClick = new EventEmitter();
        this.selectedRowsChange = new EventEmitter();
        this.bulkAction = new EventEmitter();
        this.loadMore = new EventEmitter();
        this.exportClick = new EventEmitter();
        this.inlineEditDiscardAll = new EventEmitter();
        this.inlineEditSaveAll = new EventEmitter();
        this.inlineEditReviewChanges = new EventEmitter();
        this.displayedRows = [];
        this.searchTerm = '';
        this.filters = {};
        this.sortState = { key: '', direction: '' };
        this.visibleColumnKeys = new Set();
        this.columnPanelOpen = false;
        this.filtersVisible = false;
        this.toolbarOptionsOpen = false;
        this.advancedFilterModalOpen = false;
        this.advancedFilters = {};
        this.draftAdvancedFilters = {};
        this.filteredTotal = 0;
        this.selectedRowKeys = new Set();
        this.mobileViewMode = 'cards';
        this.isMobileViewport = false;
        this.submenuOpenKey = null;
        this.submenuPosition = null;
        this.navigationOverflowOpenKey = null;
        this.navigationVisibleOptionCounts = {};
        this.mobileTableOptionsOpen = false;
        this.mobileRowActionsOpen = false;
        this.mobileRowActionTarget = null;
        this.mobileCardExpandedRowKeys = new Set();
        this.mobileLoadMoreObserver = null;
        this.mobileLoadMoreSentinelInView = false;
        this.autoLoadMoreCooldownUntil = 0;
        this.accumulatedServerRows = [];
        this.lastAccumulatedPageIndex = 0;
        this.lastSyncedServerRowsRef = null;
        this.lastSyncedServerPageIndex = -1;
        this.tableService = inject(GomTableService);
        this.host = inject((ElementRef));
        this.changeDetector = inject(ChangeDetectorRef);
        this.searchDebounceTimer = null;
        this.navigationResizeObserver = null;
        this.navigationOptionWidths = new Map();
        this.navigationLayoutTimer = null;
        this.cellEditStates = new WeakMap();
        this.pendingCellNavigation = null;
        this.pendingCellNavigationTimer = null;
        this.trackByColumn = (_, column) => column.key;
        this.trackByRow = (index) => index;
    }
    get tableBodyMaxHeight() {
        if (!Number.isFinite(Number(this.bodyViewportRows)) || Number(this.bodyViewportRows) <= 0) {
            return null;
        }
        return `${Math.trunc(Number(this.bodyViewportRows)) * 3.25}rem`;
    }
    ngOnInit() {
        this.updateViewportMode();
        this.filtersVisible = this.enableColumnSearch && this.showColumnSearchInitially;
    }
    ngAfterViewInit() {
        this.observeFilterNavigationRows();
        this.scheduleFilterNavigationLayout();
        this.syncMobileLoadMoreObserver();
    }
    ngOnDestroy() {
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        if (this.navigationLayoutTimer) {
            clearTimeout(this.navigationLayoutTimer);
        }
        if (this.pendingCellNavigationTimer) {
            clearTimeout(this.pendingCellNavigationTimer);
        }
        this.navigationResizeObserver?.disconnect();
        this.mobileLoadMoreObserver?.disconnect();
    }
    ngOnChanges(changes) {
        if (changes['columns']) {
            this.initializeVisibleColumns();
        }
        if (changes['rows'] || changes['dataMode']) {
            this.clearSelection();
            this.mobileCardExpandedRowKeys.clear();
            this.cellEditStates = new WeakMap();
            if (changes['dataMode']) {
                this.accumulatedServerRows = [];
                this.lastAccumulatedPageIndex = 0;
                this.lastSyncedServerRowsRef = null;
                this.lastSyncedServerPageIndex = -1;
            }
        }
        if (changes['filterNavigationRows'] || changes['rows']) {
            this.navigationOptionWidths.clear();
            this.navigationVisibleOptionCounts = {};
            this.scheduleFilterNavigationLayout();
        }
        if (this.dataMode === 'client') {
            this.runClientMode();
        }
        else {
            this.syncServerModeRows();
            if (changes['dataMode']?.firstChange || changes['columns']?.firstChange) {
                this.queryChange.emit(this.buildQuery());
            }
        }
        if (this.pendingCellNavigation) {
            this.schedulePendingCellNavigation();
        }
        if (changes['mobileCardView']
            || changes['mobilePaginationMode']
            || changes['mobileAutoLoadMore']
            || changes['showPagination']) {
            setTimeout(() => {
                this.syncMobileLoadMoreObserver();
            });
        }
    }
    get showMobileViewToggle() {
        return this.mobileCardView && this.isMobileViewport;
    }
    get isMobileCardsActive() {
        return this.mobileCardView && this.isMobileViewport && this.mobileViewMode === 'cards';
    }
    get isMobileTableActive() {
        return this.mobileCardView && this.isMobileViewport && this.mobileViewMode === 'table';
    }
    get visibleColumns() {
        return this.columns.filter((column) => this.visibleColumnKeys.has(column.key));
    }
    get mobileCardColumns() {
        if (this.mobileCardFields.length > 0) {
            return this.mobileCardFields
                .map((key) => this.columns.find((column) => column.key === key) ?? null)
                .filter((column) => !!column && !this.hasActionButtons(column));
        }
        return this.visibleColumns.filter((column) => !this.hasActionButtons(column));
    }
    get mobileSortColumns() {
        const sortableColumns = this.columns.filter((column) => column.sortable);
        if (this.mobileSortKeys.length === 0) {
            return sortableColumns;
        }
        const columnsByKey = new Map(sortableColumns.map((column) => [column.key, column]));
        return this.mobileSortKeys
            .map((key) => columnsByKey.get(key))
            .filter((column) => !!column);
    }
    get mobileCardActionColumn() {
        const visibleActionColumn = this.visibleColumns.find((column) => this.hasActionButtons(column));
        if (visibleActionColumn) {
            return visibleActionColumn;
        }
        return this.columns.find((column) => this.hasActionButtons(column)) ?? null;
    }
    get hasInlineFilters() {
        return this.enableColumnSearch && this.filtersVisible && this.visibleColumns.some((column) => column.filterable);
    }
    get showToolbarOptions() {
        return this.enableColumnSearch || this.enableColumnVisibility || this.showExport;
    }
    get toolbarOptionsMenuList() {
        const mainMenu = [];
        if (this.showExport) {
            mainMenu.push({
                title: 'Export',
                icon: 'ri-download-2-line',
                clickEvent: () => this.exportClick.emit(),
            });
        }
        if (this.enableColumnSearch) {
            mainMenu.push({
                title: this.filtersVisible ? 'Hide column search' : 'Show column search',
                icon: this.filtersVisible ? 'ri-checkbox-circle-fill' : 'ri-search-line',
                clickEvent: () => this.toggleFilters(),
            });
        }
        if (this.enableColumnVisibility) {
            mainMenu.push({
                title: 'Manage columns',
                icon: 'ri-layout-column-line',
                clickEvent: () => this.toggleColumnPanel(),
            });
        }
        return {
            mainMenu,
            portalMenu: [],
        };
    }
    get panelFilterDefinitions() {
        return this.advancedFilterDefinitions.filter((definition) => (definition.placement ?? 'panel') !== 'toolbar');
    }
    get toolbarFilterDefinitions() {
        return this.advancedFilterDefinitions.filter((definition) => {
            const placement = definition.placement ?? 'panel';
            return placement === 'toolbar' || placement === 'both';
        });
    }
    get activeAdvancedFilterCount() {
        return Object.values(this.advancedFilters).filter((value) => this.hasFilterValue(value)).length;
    }
    get activeColumnFilterCount() {
        return Object.values(this.filters).filter((value) => value.trim().length > 0).length;
    }
    get activeFilterCount() {
        return this.activeAdvancedFilterCount + this.activeColumnFilterCount;
    }
    get draftAdvancedFilterCount() {
        return Object.values(this.draftAdvancedFilters).filter((value) => this.hasFilterValue(value)).length;
    }
    get appliedFilterChips() {
        const advanced = Object.entries(this.advancedFilters)
            .filter(([, value]) => this.hasFilterValue(value))
            .map(([key, value]) => {
            const definition = this.advancedFilterDefinitions.find((item) => item.key === key);
            return {
                key: `advanced:${key}`,
                label: definition?.label ?? key,
                displayValue: this.formatFilterValue(definition, value),
            };
        });
        const columns = Object.entries(this.filters)
            .filter(([, value]) => value.trim().length > 0)
            .map(([key, value]) => ({
            key: `column:${key}`,
            label: this.columns.find((column) => column.key === key)?.header ?? key,
            displayValue: value,
        }));
        return [...advanced, ...columns];
    }
    get mobileSortLabel() {
        if (!this.sortState.key || !this.sortState.direction) {
            return 'Default';
        }
        const column = this.columns.find((item) => item.key === this.sortState.key);
        return `${column?.header ?? this.sortState.key} ${this.sortState.direction === 'asc' ? '↑' : '↓'}`;
    }
    get mobileSortButtonLabel() {
        if (!this.sortState.key || !this.sortState.direction) {
            return 'Default';
        }
        const column = this.columns.find((item) => item.key === this.sortState.key);
        const label = column?.header ?? 'Default';
        const maxLength = 16;
        return label.length > maxLength ? `${label.slice(0, maxLength).trimEnd()}...` : label;
    }
    getFilterNavigationOptions(row) {
        const options = (row.optionSource ?? 'static') === 'rows'
            ? this.getRowDerivedFilterNavigationOptions(row)
            : row.options ?? [];
        const allOption = row.allOption === false
            ? []
            : [{
                    ...(row.allOption ?? { label: 'All', value: '' }),
                    count: row.allOption?.count ?? ((row.optionSource === 'rows' && row.showCounts) ? this.rows.length : undefined),
                }];
        return [...allOption, ...options];
    }
    getRowDerivedFilterNavigationOptions(navigationRow) {
        const values = new Map();
        for (const row of this.rows) {
            const rawValue = navigationRow.valueAccessor
                ? navigationRow.valueAccessor(row)
                : row[navigationRow.key];
            const value = this.stringifyCellValue(rawValue).trim();
            if (value) {
                values.set(value, (values.get(value) ?? 0) + 1);
            }
        }
        return [...values].map(([value, count]) => ({
            label: value,
            value,
            count,
        }));
    }
    getVisibleFilterNavigationOptions(row) {
        const options = this.getFilterNavigationOptions(row);
        return options.slice(0, this.navigationVisibleOptionCounts[row.key] ?? options.length);
    }
    getOverflowFilterNavigationOptions(row) {
        const options = this.getFilterNavigationOptions(row);
        return options.slice(this.navigationVisibleOptionCounts[row.key] ?? options.length);
    }
    isFilterNavigationOptionActive(row, option) {
        return this.getFilterString(this.advancedFilters, row.key) === option.value;
    }
    hasActiveOverflowFilterNavigationOption(row) {
        return this.getOverflowFilterNavigationOptions(row).some((option) => this.isFilterNavigationOptionActive(row, option));
    }
    selectFilterNavigationOption(row, option) {
        if (option.disabled || this.isFilterNavigationOptionActive(row, option)) {
            this.navigationOverflowOpenKey = null;
            return;
        }
        this.navigationOverflowOpenKey = null;
        this.setQuickFilterValue(row.key, option.value);
        this.filterNavigationChange.emit({ key: row.key, value: option.value });
    }
    toggleFilterNavigationOverflow(event, rowKey) {
        event.stopPropagation();
        this.navigationOverflowOpenKey = this.navigationOverflowOpenKey === rowKey ? null : rowKey;
    }
    onFilterNavigationKeydown(event, rowKey) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            return;
        }
        const row = this.findFilterNavigationElement('data-filter-navigation-row', rowKey);
        const buttons = Array.from(row?.querySelectorAll('button:not(:disabled)') ?? []);
        const currentIndex = buttons.indexOf(event.target);
        if (currentIndex < 0 || !buttons.length) {
            return;
        }
        event.preventDefault();
        let nextIndex;
        if (event.key === 'Home') {
            nextIndex = 0;
        }
        else if (event.key === 'End') {
            nextIndex = buttons.length - 1;
        }
        else {
            const offset = event.key === 'ArrowRight' ? 1 : -1;
            nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
        }
        buttons[nextIndex]?.focus();
    }
    get pageSizeSelectOptions() {
        return this.pageSizeOptions.map((option) => ({
            value: String(option),
            label: `Show ${option}`,
        }));
    }
    get skeletonRows() {
        const parsedPageSize = Number(this.pageSize);
        const rowCount = Number.isFinite(parsedPageSize)
            ? Math.max(1, Math.min(100, Math.trunc(parsedPageSize)))
            : 10;
        return Array.from({ length: rowCount }, (_, index) => index);
    }
    get pageSizeModel() {
        return String(this.pageSize);
    }
    get totalPages() {
        return Math.max(1, Math.ceil(this.paginationTotal / this.pageSize));
    }
    get paginationTotal() {
        return Math.max(0, this.dataMode === 'client' ? this.filteredTotal : this.totalItems);
    }
    get paginationRangeStart() {
        if (this.isMobileLoadMoreActive()) {
            return this.paginationTotal === 0 ? 0 : 1;
        }
        return this.paginationTotal === 0 ? 0 : (this.pageIndex * this.pageSize) + 1;
    }
    get paginationRangeEnd() {
        if (this.isMobileLoadMoreActive()) {
            return Math.min(this.displayedRows.length, this.paginationTotal);
        }
        return Math.min((this.pageIndex + 1) * this.pageSize, this.paginationTotal);
    }
    get paginationItems() {
        const total = this.totalPages;
        const current = this.pageIndex + 1;
        if (total <= 7) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }
        if (current <= 3) {
            const end = Math.max(3, current + 1);
            return [
                ...Array.from({ length: end }, (_, index) => index + 1),
                'ellipsis-end',
                total,
            ];
        }
        if (current >= total - 2) {
            const start = Math.min(total - 2, current - 1);
            return [
                1,
                'ellipsis-start',
                ...Array.from({ length: total - start + 1 }, (_, index) => start + index),
            ];
        }
        return [1, 'ellipsis-start', current - 1, current, current + 1, 'ellipsis-end', total];
    }
    getActionLabel(action, row) {
        return typeof action.label === 'function' ? action.label(row) : action.label;
    }
    getActionIcon(action, row) {
        if (!action.icon) {
            return null;
        }
        return typeof action.icon === 'function' ? action.icon(row) : action.icon;
    }
    isActionDisabled(action, row) {
        return action.disabled ? action.disabled(row) : false;
    }
    getActionTitle(action, row) {
        if (this.isActionDisabled(action, row)) {
            if (action.disabledTooltip) {
                return typeof action.disabledTooltip === 'function'
                    ? action.disabledTooltip(row)
                    : action.disabledTooltip;
            }
            return 'You do not have permission for this action';
        }
        return this.getActionLabel(action, row);
    }
    get canGoPrevious() {
        return this.pageIndex > 0;
    }
    get canGoNext() {
        if (this.isMobileLoadMoreActive()) {
            return this.displayedRows.length < this.paginationTotal;
        }
        return this.pageIndex + 1 < this.totalPages;
    }
    get hasSelectedRows() {
        return this.selectedRowKeys.size > 0;
    }
    get selectedRowCount() {
        return this.selectedRowKeys.size;
    }
    get selectedRows() {
        return this.rows.filter((row, rowIndex) => this.selectedRowKeys.has(this.getRowKey(row, rowIndex)));
    }
    get visibleBulkActions() {
        const selectedRows = this.selectedRows;
        return this.bulkActions.filter((action) => action.visible ? action.visible(selectedRows) : true);
    }
    get selectionSummary() {
        const label = this.selectedRowCount === 1 ? this.selectionItemLabel : `${this.selectionItemLabel}s`;
        return `${this.selectedRowCount} ${label} selected`;
    }
    isBulkActionDisabled(action) {
        return Boolean(this.bulkActionBusyKey) || (action.disabled ? action.disabled(this.selectedRows) : false);
    }
    getBulkActionTitle(action) {
        if (!this.isBulkActionDisabled(action)) {
            return action.label;
        }
        if (!action.disabledTooltip) {
            return this.bulkActionBusyKey ? 'Another bulk action is in progress' : action.label;
        }
        return typeof action.disabledTooltip === 'function'
            ? action.disabledTooltip(this.selectedRows)
            : action.disabledTooltip;
    }
    triggerBulkAction(action) {
        if (!this.hasSelectedRows || this.isBulkActionDisabled(action)) {
            return;
        }
        this.bulkAction.emit({
            actionKey: action.actionKey,
            selectedRows: this.selectedRows,
            selectedRowKeys: Array.from(this.selectedRowKeys),
        });
    }
    clearSelectedRows() {
        this.clearSelection();
    }
    toggleColumnPanel() {
        this.columnPanelOpen = !this.columnPanelOpen;
        this.toolbarOptionsOpen = false;
    }
    toggleFilters() {
        if (!this.enableColumnSearch) {
            return;
        }
        this.filtersVisible = !this.filtersVisible;
        this.toolbarOptionsOpen = false;
    }
    toggleToolbarOptions(event) {
        event?.stopPropagation();
        this.toolbarOptionsOpen = !this.toolbarOptionsOpen;
    }
    openAdvancedFilters() {
        if (!this.panelFilterDefinitions.length) {
            return;
        }
        this.draftAdvancedFilters = this.cloneFilterValues(this.advancedFilters);
        this.advancedFilterModalOpen = true;
    }
    closeAdvancedFilters() {
        this.advancedFilterModalOpen = false;
        this.draftAdvancedFilters = this.cloneFilterValues(this.advancedFilters);
    }
    applyAdvancedFilters() {
        this.advancedFilters = this.cloneFilterValues(this.draftAdvancedFilters);
        this.advancedFilterModalOpen = false;
        this.pageIndex = 0;
        this.refresh();
    }
    clearDraftAdvancedFilters() {
        this.draftAdvancedFilters = {};
    }
    clearAdvancedFilters() {
        this.advancedFilters = {};
        this.draftAdvancedFilters = {};
        this.pageIndex = 0;
        this.refresh();
    }
    clearAllFilters() {
        this.advancedFilters = {};
        this.draftAdvancedFilters = {};
        this.filters = {};
        this.pageIndex = 0;
        this.filterChange.emit(this.filters);
        this.refresh();
        this.changeDetector.markForCheck();
    }
    clearAllQueryFilters() {
        this.searchTerm = '';
        this.advancedFilters = {};
        this.draftAdvancedFilters = {};
        this.filters = {};
        this.pageIndex = 0;
        this.filterChange.emit(this.filters);
        this.refresh();
        this.changeDetector.markForCheck();
    }
    setQueryFilters(filters, clearSearch = true) {
        if (clearSearch) {
            this.searchTerm = '';
        }
        this.advancedFilters = this.cloneFilterValues(filters);
        this.draftAdvancedFilters = this.cloneFilterValues(this.advancedFilters);
        this.filters = {};
        this.pageIndex = 0;
        this.filterChange.emit(this.filters);
        this.refresh();
        this.changeDetector.markForCheck();
    }
    removeAppliedFilter(chipKey) {
        const separator = chipKey.indexOf(':');
        const type = chipKey.slice(0, separator);
        const key = chipKey.slice(separator + 1);
        if (type === 'advanced') {
            const { [key]: _removed, ...remaining } = this.advancedFilters;
            this.advancedFilters = remaining;
            this.draftAdvancedFilters = this.cloneFilterValues(remaining);
        }
        else {
            const { [key]: _removed, ...remaining } = this.filters;
            this.filters = remaining;
            this.filterChange.emit(this.filters);
        }
        this.pageIndex = 0;
        this.refresh();
    }
    toggleColumn(columnKey) {
        const column = this.columns.find((item) => item.key === columnKey);
        if (!column || column.hideable === false) {
            return;
        }
        if (this.visibleColumnKeys.has(columnKey)) {
            const visibleHideableColumns = this.visibleColumns.filter((item) => item.hideable !== false);
            if (visibleHideableColumns.length === 1) {
                return;
            }
            this.visibleColumnKeys.delete(columnKey);
        }
        else {
            this.visibleColumnKeys.add(columnKey);
        }
        this.pageIndex = 0;
        this.columnVisibilityChange.emit([...this.visibleColumnKeys]);
        this.refresh();
    }
    setSort(column) {
        if (!column.sortable) {
            return;
        }
        this.sortState = {
            key: column.key,
            direction: this.getNextSortDirection(column.key),
        };
        if (this.sortState.direction === '') {
            this.sortState.key = '';
        }
        this.pageIndex = 0;
        this.sortChange.emit(this.sortState);
        this.refresh();
    }
    setSearchTerm(term) {
        this.searchTerm = term;
        this.pageIndex = 0;
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        if (this.searchDebounceMs <= 0) {
            this.refresh();
            return;
        }
        this.searchDebounceTimer = setTimeout(() => {
            this.searchDebounceTimer = null;
            this.refresh();
        }, this.searchDebounceMs);
    }
    clearSearch() {
        this.setSearchTerm('');
    }
    setFilter(columnKey, value) {
        this.filters[columnKey] = value;
        this.pageIndex = 0;
        this.filterChange.emit(this.filters);
        this.refresh();
    }
    clearFilter(columnKey) {
        this.filters[columnKey] = '';
        this.pageIndex = 0;
        this.filterChange.emit(this.filters);
        this.refresh();
    }
    getFilterOptions(definition) {
        let options;
        if ((definition.optionSource ?? 'static') === 'static') {
            options = definition.options ?? [];
        }
        else {
            const values = new Map();
            for (const row of this.rows) {
                const rawValue = definition.valueAccessor ? definition.valueAccessor(row) : row[definition.key];
                const value = this.stringifyCellValue(rawValue).trim();
                if (value && !values.has(value)) {
                    values.set(value, value);
                }
            }
            options = [...values].map(([value, label]) => ({ value, label }));
        }
        if (definition.type === 'select' && !options.some((option) => option.value === '')) {
            return [{ label: `All ${definition.label}`, value: '' }, ...options];
        }
        return options;
    }
    getFilterOptionCount(definition, value) {
        return definition.options?.find((option) => option.value === value)?.count;
    }
    getFilterString(source, key) {
        const value = source[key];
        return typeof value === 'string' ? value : '';
    }
    getFilterArray(source, key) {
        const value = source[key];
        return Array.isArray(value) ? value : [];
    }
    getFilterRange(source, key) {
        const value = source[key];
        return value && !Array.isArray(value) && typeof value === 'object'
            ? value
            : { from: '', to: '' };
    }
    setDraftFilterValue(key, value) {
        this.draftAdvancedFilters = { ...this.draftAdvancedFilters, [key]: value };
    }
    isDraftOptionSelected(key, value) {
        const selected = this.draftAdvancedFilters[key];
        return Array.isArray(selected) ? selected.includes(value) : selected === value;
    }
    toggleDraftFilterOption(filter, value) {
        if (filter.mobileControl === 'checkboxes' || filter.type === 'multi-select') {
            const selected = this.getFilterArray(this.draftAdvancedFilters, filter.key);
            this.setDraftFilterValue(filter.key, selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
            return;
        }
        this.setDraftFilterValue(filter.key, value);
    }
    setDraftDateRangeValue(key, boundary, value) {
        const current = this.getFilterRange(this.draftAdvancedFilters, key);
        this.setDraftFilterValue(key, { ...current, [boundary]: value });
    }
    setQuickFilterValue(key, value) {
        this.advancedFilters = { ...this.advancedFilters, [key]: value };
        this.draftAdvancedFilters = this.cloneFilterValues(this.advancedFilters);
        this.pageIndex = 0;
        this.refresh();
    }
    changePageSize(nextPageSize) {
        this.pageSize = Number(nextPageSize);
        this.pageIndex = 0;
        this.emitPageChange();
        this.refresh();
    }
    onPageSizeSelectChange(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return;
        }
        this.changePageSize(parsed);
    }
    previousPage() {
        if (!this.canGoPrevious) {
            return;
        }
        this.pageIndex -= 1;
        this.emitPageChange();
        this.refresh();
    }
    goToPage(pageNumber) {
        const nextPageIndex = Math.min(Math.max(Math.trunc(pageNumber) - 1, 0), this.totalPages - 1);
        if (nextPageIndex === this.pageIndex) {
            return;
        }
        this.pageIndex = nextPageIndex;
        this.emitPageChange();
        this.refresh();
    }
    nextPage() {
        if (!this.canGoNext) {
            return;
        }
        this.pageIndex += 1;
        this.emitPageChange();
        this.refresh();
    }
    requestLoadMore() {
        if (!this.canGoNext || this.loading) {
            return;
        }
        if (this.dataMode === 'client') {
            this.nextPage();
            return;
        }
        if (this.mobileLoadMoreStrategy === 'page-query') {
            this.pageIndex += 1;
            this.emitPageChange();
            this.queryChange.emit(this.buildQuery());
            return;
        }
        this.loadMore.emit({ pageIndex: this.pageIndex + 1, pageSize: this.pageSize });
    }
    getSortDirection(columnKey) {
        return this.sortState.key === columnKey ? this.sortState.direction : '';
    }
    getHeaderAlign(column) {
        return column.headerAlign ?? 'left';
    }
    getCellAlign(column) {
        return column.cellAlign ?? 'left';
    }
    getTextMode(column) {
        return column.textMode ?? 'truncate';
    }
    getCellValue(row, column) {
        const rawValue = row[column.key];
        if (column.format) {
            return column.format(rawValue, row);
        }
        return this.stringifyCellValue(rawValue);
    }
    getCellTitle(row, column) {
        const rawValue = row[column.key];
        if (column.tooltip) {
            return column.tooltip(rawValue, row);
        }
        return this.getCellValue(row, column);
    }
    getCellClass(row, column) {
        const rawValue = row[column.key];
        if (column.cellClass) {
            return column.cellClass(rawValue, row);
        }
        return '';
    }
    getEditableConfig(column) {
        if (!column.editable) {
            return null;
        }
        return column.editable === true ? {} : column.editable;
    }
    isCellEditDisabled(row, column) {
        return this.getEditableConfig(column)?.disabled?.(row) ?? false;
    }
    isCellEditing(row, column) {
        const config = this.getEditableConfig(column);
        return !!config && (config.mode === 'always' || this.getCellEditState(row, column) !== null);
    }
    getCellEditType(column) {
        return this.getEditableConfig(column)?.type ?? 'text';
    }
    getCellEditInputType(column) {
        // Native number inputs sanitize intermediate decimal drafts such as `151.`
        // to an empty value. Keep the draft textual and validate/convert on commit.
        return 'text';
    }
    getCellEditInputMode(column) {
        return this.getCellEditType(column) === 'number' ? 'decimal' : 'text';
    }
    getCellDraft(row, column) {
        return this.getCellEditState(row, column)?.draft ?? this.stringifyCellValue(row[column.key]);
    }
    getCellEditError(row, column) {
        return this.getCellEditState(row, column)?.error ?? '';
    }
    startCellEdit(event, row, column) {
        event.stopPropagation();
        if (!this.getEditableConfig(column) || this.isCellEditDisabled(row, column)) {
            return;
        }
        this.ensureCellEditState(row, column);
        this.changeDetector.markForCheck();
        const cell = event.currentTarget?.closest('td');
        globalThis.setTimeout(() => {
            const input = cell?.querySelector('.gom-table-cell-editor input');
            input?.focus();
            input?.select();
        });
    }
    onCellEditTriggerKeydown(event, row, column) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.startCellEdit(event, row, column);
        }
    }
    setCellDraft(row, column, value) {
        const state = this.ensureCellEditState(row, column);
        state.draft = value;
        state.error = '';
    }
    onCellEditorKeydown(event, row, column) {
        event.stopPropagation();
        if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            this.commitAndMoveCellEdit(row, column, event.key === 'ArrowDown' ? 1 : -1);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            this.commitCellEdit(row, column);
        }
        else if (event.key === 'Escape') {
            event.preventDefault();
            this.cancelCellEdit(row, column);
        }
    }
    commitCellEdit(row, column) {
        const state = this.getCellEditState(row, column);
        if (!state || this.isCellEditDisabled(row, column)) {
            return;
        }
        const result = this.validateCellDraft(column, state.draft);
        if (result.error) {
            state.error = result.error;
            this.changeDetector.markForCheck();
            return;
        }
        this.deleteCellEditState(row, column);
        if (!Object.is(state.previousValue, result.value)) {
            this.cellEdit.emit({
                row,
                columnKey: column.key,
                previousValue: state.previousValue,
                value: result.value,
            });
        }
        this.changeDetector.markForCheck();
    }
    cancelCellEdit(row, column) {
        this.deleteCellEditState(row, column);
        this.changeDetector.markForCheck();
    }
    commitAndMoveCellEdit(row, column, direction) {
        const currentIndex = this.displayedRows.indexOf(row);
        if (currentIndex < 0) {
            return;
        }
        let targetIndex = currentIndex + direction;
        while (targetIndex >= 0
            && targetIndex < this.displayedRows.length
            && this.isCellEditDisabled(this.displayedRows[targetIndex], column)) {
            targetIndex += direction;
        }
        const targetRow = this.displayedRows[targetIndex];
        if (!targetRow) {
            return;
        }
        this.pendingCellNavigation = {
            rowKey: this.getRowKey(targetRow, targetIndex),
            columnKey: column.key,
        };
        this.commitCellEdit(row, column);
        this.schedulePendingCellNavigation();
    }
    schedulePendingCellNavigation() {
        if (this.pendingCellNavigationTimer) {
            clearTimeout(this.pendingCellNavigationTimer);
        }
        this.pendingCellNavigationTimer = globalThis.setTimeout(() => {
            this.pendingCellNavigationTimer = null;
            const pending = this.pendingCellNavigation;
            if (!pending) {
                return;
            }
            const column = this.visibleColumns.find((candidate) => candidate.key === pending.columnKey);
            const rowIndex = this.displayedRows.findIndex((candidate, index) => this.getRowKey(candidate, index) === pending.rowKey);
            const row = this.displayedRows[rowIndex];
            if (!column || !row || this.isCellEditDisabled(row, column)) {
                this.pendingCellNavigation = null;
                return;
            }
            this.ensureCellEditState(row, column);
            this.changeDetector.markForCheck();
            this.focusCellEditor(rowIndex, column);
        });
    }
    focusCellEditor(rowIndex, column) {
        const columnIndex = this.visibleColumns.findIndex((candidate) => candidate.key === column.key);
        if (columnIndex < 0) {
            return;
        }
        globalThis.setTimeout(() => {
            const hostElement = this.host.nativeElement;
            const tableRows = hostElement.querySelectorAll('tbody > tr');
            const tableRow = tableRows.item(rowIndex);
            const selectionOffset = this.enableRowSelection ? 1 : 0;
            const tableCell = tableRow?.cells.item(columnIndex + selectionOffset);
            const input = tableCell?.querySelector('.gom-table-cell-editor input');
            if (input) {
                input.focus();
                input.select();
                this.pendingCellNavigation = null;
            }
            else if (this.pendingCellNavigation) {
                this.schedulePendingCellNavigation();
            }
        });
    }
    getChipTone(row, column) {
        const rawValue = row[column.key];
        if (!column.chipTone) {
            return 'neutral';
        }
        if (typeof column.chipTone === 'function') {
            return column.chipTone(rawValue, row);
        }
        return column.chipTone;
    }
    getCellActionKey(row, column) {
        if (!column.clickActionKey) {
            return null;
        }
        if (typeof column.clickActionKey === 'function') {
            return column.clickActionKey(row);
        }
        return column.clickActionKey;
    }
    getCellActionIcon(row, column) {
        if (!column.clickActionIcon) {
            return null;
        }
        if (typeof column.clickActionIcon === 'function') {
            return column.clickActionIcon(row) || null;
        }
        return column.clickActionIcon;
    }
    onCellActionClick(event, actionKey, row) {
        event.stopPropagation();
        this.triggerRowAction(actionKey, row);
    }
    onCellActionKeydown(event, actionKey, row) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.onCellActionClick(event, actionKey, row);
        }
    }
    getCellEditState(row, column) {
        return this.cellEditStates.get(row)?.get(column.key) ?? null;
    }
    ensureCellEditState(row, column) {
        let rowStates = this.cellEditStates.get(row);
        if (!rowStates) {
            rowStates = new Map();
            this.cellEditStates.set(row, rowStates);
        }
        let state = rowStates.get(column.key);
        if (!state) {
            const previousValue = row[column.key];
            state = { previousValue, draft: this.stringifyCellValue(previousValue), error: '' };
            rowStates.set(column.key, state);
        }
        return state;
    }
    deleteCellEditState(row, column) {
        const rowStates = this.cellEditStates.get(row);
        rowStates?.delete(column.key);
        if (rowStates?.size === 0) {
            this.cellEditStates.delete(row);
        }
    }
    validateCellDraft(column, draft) {
        const config = this.getEditableConfig(column);
        if (config?.type !== 'number') {
            return { value: draft, error: '' };
        }
        if (draft.trim() === '') {
            return { value: draft, error: `${column.header} is required.` };
        }
        const value = this.parseNumericDraft(draft);
        if (value === null) {
            return { value: draft, error: `Enter a valid ${column.header.toLowerCase()}.` };
        }
        if (config.min !== undefined && value < config.min) {
            return { value, error: `${column.header} must be at least ${config.min}.` };
        }
        if (config.max !== undefined && value > config.max) {
            return { value, error: `${column.header} must be at most ${config.max}.` };
        }
        if (config.step !== undefined && config.step > 0) {
            const stepBase = config.min ?? 0;
            const steps = (value - stepBase) / config.step;
            if (Math.abs(steps - Math.round(steps)) > 1e-9) {
                return { value, error: `${column.header} must use increments of ${config.step}.` };
            }
        }
        return { value, error: '' };
    }
    parseNumericDraft(draft) {
        const trimmed = draft.trim();
        if (!trimmed) {
            return null;
        }
        const normalized = trimmed.includes('.') && trimmed.includes(',')
            ? trimmed.replaceAll(',', '')
            : trimmed.replace(',', '.');
        const value = Number(normalized);
        return Number.isFinite(value) ? value : null;
    }
    hasActionButtons(column) {
        return !!column.actionButtons?.length;
    }
    getActionButtons(column) {
        return column.actionButtons ?? [];
    }
    hasOverflowMenu(column) {
        const config = column.actionOverflowMenu;
        if (!config?.actionKeys?.length || !column.actionButtons?.length) {
            return false;
        }
        const configuredKeys = new Set(config.actionKeys);
        return column.actionButtons.some((action) => configuredKeys.has(action.actionKey));
    }
    getInlineActionButtons(column) {
        const actions = column.actionButtons ?? [];
        const overflowKeys = new Set(column.actionOverflowMenu?.actionKeys ?? []);
        if (!overflowKeys.size) {
            return actions;
        }
        return actions.filter((action) => !overflowKeys.has(action.actionKey));
    }
    getOverflowActionButtons(column) {
        const actions = column.actionButtons ?? [];
        const overflowKeys = new Set(column.actionOverflowMenu?.actionKeys ?? []);
        if (!overflowKeys.size) {
            return [];
        }
        return actions.filter((action) => overflowKeys.has(action.actionKey));
    }
    getOverflowMenuConfig(column) {
        return column.actionOverflowMenu ?? null;
    }
    getOverflowMenuTriggerIcon(column) {
        return column.actionOverflowMenu?.triggerIcon || 'ri-more-2-fill';
    }
    getOverflowMenuTriggerAriaLabel(column) {
        return column.actionOverflowMenu?.triggerAriaLabel || 'More actions';
    }
    getOverflowMenuTriggerTitle(column) {
        return column.actionOverflowMenu?.triggerButtonTitle || 'More actions';
    }
    getOverflowMenuBackButtonText(column) {
        return column.actionOverflowMenu?.backButtonText || column.header || 'Actions';
    }
    getOverflowMenuList(column, row) {
        const mainMenu = this.getOverflowActionButtons(column).map((action) => {
            const subActions = this.getSubActions(action);
            if (subActions.length > 0) {
                return {
                    title: this.getActionLabel(action, row),
                    icon: this.getActionIcon(action, row) || 'ri-more-line',
                    submenu: subActions.map((subAction) => ({
                        title: this.getActionLabel(subAction, row),
                        icon: this.getActionIcon(subAction, row) || 'ri-arrow-right-line',
                        clickEvent: (event) => {
                            event.stopPropagation();
                            this.triggerRowAction(subAction.actionKey, row);
                        },
                    })),
                };
            }
            return {
                title: this.getActionLabel(action, row),
                icon: this.getActionIcon(action, row) || 'ri-arrow-right-line',
                clickEvent: (event) => {
                    event.stopPropagation();
                    this.triggerRowAction(action.actionKey, row);
                },
            };
        });
        return {
            mainMenu,
            portalMenu: [],
        };
    }
    triggerRowAction(actionKey, row) {
        this.submenuOpenKey = null;
        this.submenuPosition = null;
        this.rowAction.emit({ actionKey, row });
    }
    toggleSubmenu(event, action, row, rowIndex) {
        event.stopPropagation();
        const key = this.getSubmenuKey(action, row, rowIndex);
        if (this.submenuOpenKey === key) {
            this.submenuOpenKey = null;
            this.submenuPosition = null;
            return;
        }
        const trigger = event.target.closest('button') ?? event.target;
        const rect = trigger.getBoundingClientRect();
        const estimatedMenuHeight = 180;
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < estimatedMenuHeight) {
            this.submenuPosition = {
                bottom: `${window.innerHeight - rect.top + 4}px`,
                right: `${window.innerWidth - rect.right}px`,
                top: 'auto',
            };
        }
        else {
            this.submenuPosition = {
                top: `${rect.bottom + 4}px`,
                right: `${window.innerWidth - rect.right}px`,
                bottom: 'auto',
            };
        }
        this.submenuOpenKey = key;
    }
    isSubmenuOpen(action, row, rowIndex) {
        return this.submenuOpenKey === this.getSubmenuKey(action, row, rowIndex);
    }
    getSubActions(action) {
        return action.subActions ?? [];
    }
    onSubmenuActionClick(event, actionKey, row) {
        event.stopPropagation();
        this.triggerRowAction(actionKey, row);
    }
    onMobileCardClick(row) {
        if (!this.mobileCardClickable) {
            return;
        }
        this.rowClick.emit(row);
    }
    getMobileCardActions(row) {
        const actionColumn = this.mobileCardActionColumn;
        if (!actionColumn?.actionButtons?.length) {
            return [];
        }
        return actionColumn.actionButtons;
    }
    openMobileTableOptions() {
        this.mobileTableOptionsOpen = true;
        this.toolbarOptionsOpen = false;
    }
    closeMobileTableOptions() {
        this.mobileTableOptionsOpen = false;
    }
    toggleMobileColumnSearch() {
        this.toggleFilters();
        this.closeMobileTableOptions();
        if (this.filtersVisible) {
            requestAnimationFrame(() => {
                const tableWrap = this.host.nativeElement.querySelector('.gom-table-wrap');
                tableWrap?.scrollTo({ left: 0, behavior: 'smooth' });
            });
        }
    }
    openMobileColumnPanel() {
        this.columnPanelOpen = true;
        this.closeMobileTableOptions();
    }
    openMobileRowActions(row) {
        this.mobileRowActionTarget = row;
        this.mobileRowActionsOpen = true;
    }
    closeMobileRowActions() {
        this.mobileRowActionsOpen = false;
        this.mobileRowActionTarget = null;
    }
    getMobileRowSheetActions(row) {
        return this.getMobileCardActions(row).flatMap((action) => action.subActions?.length ? action.subActions : [action]);
    }
    getMobileCardTitle(row, rowIndex) {
        const titleKey = this.resolveMobileCardHeaderTitleKey(row);
        if (titleKey) {
            const value = this.getMobileCardValue(row, titleKey);
            if (value) {
                return value;
            }
        }
        return this.getMobileCardFallbackTitle(row, rowIndex);
    }
    getMobileCardSubtitleParts(row) {
        return this.resolveMobileCardHeaderSubtitleKeys(row)
            .map((key) => this.getMobileCardValue(row, key))
            .filter((value) => value.length > 0)
            .slice(0, 2);
    }
    getMobileCardStatusLabel(row) {
        const statusKey = this.resolveMobileCardHeaderStatusKey(row);
        if (!statusKey) {
            return '';
        }
        const value = this.getMobileCardValue(row, statusKey);
        if (!value) {
            return '';
        }
        if (String(statusKey).toLowerCase().includes('stock')) {
            return `${value} STOCK`;
        }
        return value;
    }
    getMobileCardStatusTone(row) {
        const statusKey = this.resolveMobileCardHeaderStatusKey(row);
        if (!statusKey) {
            return 'neutral';
        }
        if (String(statusKey).toLowerCase().includes('stock') && 'stockSeverity' in row) {
            const severityValue = row['stockSeverity'];
            const severity = typeof severityValue === 'string' ? severityValue.toLowerCase() : '';
            if (severity === 'critical') {
                return 'danger';
            }
            if (severity === 'low') {
                return 'warning';
            }
            return 'success';
        }
        return this.getMobileCardTone(row, statusKey);
    }
    hasMobileCardStatus(row) {
        return this.getMobileCardStatusLabel(row).trim().length > 0;
    }
    getMobileCardVisibleFields(row) {
        const configuredFields = this.mobileCardConfig?.body?.visibleFields;
        if (configuredFields !== undefined) {
            return configuredFields;
        }
        return this.getFallbackMobileCardFields(row).slice(0, 4).map((column) => ({
            key: column.key,
            label: column.header,
            width: 'half',
        }));
    }
    getMobileCardExpandableFields(row) {
        const configuredFields = this.mobileCardConfig?.body?.expandableFields;
        if (configuredFields !== undefined) {
            return configuredFields;
        }
        const visibleKeys = new Set([
            ...this.getMobileCardVisibleFields(row).map((field) => field.key),
            ...this.resolveMobileCardHeaderSubtitleKeys(row),
            ...(this.resolveMobileCardHeaderTitleKey(row) ? [this.resolveMobileCardHeaderTitleKey(row)] : []),
            ...(this.resolveMobileCardHeaderStatusKey(row) ? [this.resolveMobileCardHeaderStatusKey(row)] : []),
        ]);
        return this.getFallbackMobileCardFields(row)
            .filter((column) => !visibleKeys.has(column.key))
            .map((column) => ({
            key: column.key,
            label: column.header,
            width: 'half',
        }));
    }
    hasMobileCardExpandableFields(row) {
        return this.getMobileCardExpandableFields(row).length > 0;
    }
    isMobileCardExpanded(row, rowIndex) {
        const rowKey = this.getRowKey(row, rowIndex);
        if (this.mobileCardConfig?.body?.defaultExpanded) {
            return true;
        }
        return this.mobileCardExpandedRowKeys.has(rowKey);
    }
    toggleMobileCardDetails(event, row, rowIndex) {
        event.stopPropagation();
        const rowKey = this.getRowKey(row, rowIndex);
        if (this.mobileCardExpandedRowKeys.has(rowKey)) {
            this.mobileCardExpandedRowKeys.delete(rowKey);
            return;
        }
        this.mobileCardExpandedRowKeys.add(rowKey);
    }
    getMobileCardDetailsToggleLabel(row, rowIndex) {
        const expanded = this.isMobileCardExpanded(row, rowIndex);
        const footer = this.mobileCardConfig?.footer;
        return expanded
            ? (footer?.collapseLabel || 'View Less Details ↑')
            : (footer?.expandLabel || 'View More Details ↓');
    }
    shouldShowMobileCardDetailsToggle(row) {
        const footer = this.mobileCardConfig?.footer;
        if (footer?.showDetailsToggle === false) {
            return false;
        }
        return this.hasMobileCardExpandableFields(row);
    }
    hasMobileCardBody(row, rowIndex) {
        return (this.getMobileCardVisibleFields(row).length > 0
            || this.shouldShowMobileCardDetailsToggle(row)
            || (this.isMobileCardExpanded(row, rowIndex) && this.getMobileCardExpandableFields(row).length > 0));
    }
    getMobileCardPrimaryActions(row) {
        const actionKeys = this.mobileCardConfig?.footer?.primaryActionKeys ?? [];
        if (!actionKeys.length) {
            return [];
        }
        return actionKeys
            .map((actionKey) => this.getMobileCardActionByKey(actionKey))
            .filter((action) => !!action && !action.subActions?.length);
    }
    getMobileCardOverflowActions(row) {
        const overflowActionKeys = this.mobileCardConfig?.header?.overflowActionKeys ?? [];
        if (!overflowActionKeys.length) {
            return [];
        }
        return overflowActionKeys
            .map((actionKey) => this.getMobileCardActionByKey(actionKey))
            .filter((action) => !!action && !action.subActions?.length);
    }
    getMobileCardOverflowMenuList(row) {
        return {
            mainMenu: this.getMobileCardOverflowActions(row).map((action) => ({
                title: this.getActionLabel(action, row),
                icon: this.getMobileCardActionIcon(action, row) || 'ri-more-line',
                clickEvent: (event) => this.onMobileCardOverflowActionClick(event, action.actionKey, row),
            })),
            portalMenu: [],
        };
    }
    getMobileCardActionLabel(action, row) {
        return this.getActionLabel(action, row);
    }
    getMobileCardActionIcon(action, row) {
        return this.getActionIcon(action, row);
    }
    showMobileCardPrimaryActionLabels() {
        return this.mobileCardConfig?.footer?.showPrimaryActionLabels !== false;
    }
    onMobileCardOverflowActionClick(event, actionKey, row) {
        event.stopPropagation();
        this.triggerRowAction(actionKey, row);
    }
    getMobileCardFieldLabel(row, field) {
        return field.label || this.getMobileCardValueLabel(row, field.key);
    }
    getMobileCardFieldValue(row, field) {
        const rawValue = this.getMobileCardValue(row, field.key);
        if (field.format) {
            return field.format(rawValue, row);
        }
        return rawValue;
    }
    isMobileCardFieldHidden(row, field) {
        return field.hideWhenEmpty !== false && this.getMobileCardFieldValue(row, field).trim().length === 0;
    }
    getMobileCardFieldWidth(field) {
        return field.width === 'full' ? 'full' : 'half';
    }
    triggerMobileRowAction(actionKey) {
        if (this.mobileRowActionTarget) {
            this.triggerRowAction(actionKey, this.mobileRowActionTarget);
        }
        this.closeMobileRowActions();
    }
    getMobileCardValueLabel(row, key) {
        if (!key) {
            return '';
        }
        const column = this.columns.find((item) => item.key === key);
        return column?.header || key;
    }
    getFallbackMobileCardFields(row) {
        const configuredKeys = new Set([
            ...(this.mobileCardConfig?.header?.subtitleKeys ?? []),
            ...(this.mobileCardConfig?.body?.visibleFields ?? []).map((field) => field.key),
            ...(this.mobileCardConfig?.body?.expandableFields ?? []).map((field) => field.key),
            ...(this.mobileCardConfig?.footer?.primaryActionKeys ?? []),
            ...(this.mobileCardConfig?.footer?.secondaryActionKeys ?? []),
        ]);
        const columns = this.visibleColumns.filter((column) => !this.hasActionButtons(column));
        return columns.filter((column) => !configuredKeys.has(column.key));
    }
    resolveMobileCardHeaderTitleKey(row) {
        return this.mobileCardConfig?.header?.titleKey ?? this.getFallbackMobileCardFields(row)[0]?.key;
    }
    resolveMobileCardHeaderSubtitleKeys(row) {
        if (this.mobileCardConfig?.header?.subtitleKeys?.length) {
            return this.mobileCardConfig.header.subtitleKeys;
        }
        return this.getFallbackMobileCardFields(row)
            .slice(1, 3)
            .map((column) => column.key);
    }
    resolveMobileCardHeaderStatusKey(row) {
        if (this.mobileCardConfig?.header?.statusKey) {
            return this.mobileCardConfig.header.statusKey;
        }
        return this.getFallbackMobileCardFields(row).find((column) => Boolean(column.chipTone) || /status|state|payment/i.test(column.header))?.key;
    }
    getMobileCardFallbackTitle(row, rowIndex) {
        const columns = this.getFallbackMobileCardFields(row);
        const primaryColumn = columns[0];
        if (!primaryColumn) {
            return `Row ${rowIndex + 1}`;
        }
        return this.getMobileCardValue(row, primaryColumn.key) || `Row ${rowIndex + 1}`;
    }
    getMobileCardActionByKey(actionKey) {
        for (const column of this.columns) {
            if (!column.actionButtons?.length) {
                continue;
            }
            const action = this.findActionButtonByKey(column.actionButtons, actionKey);
            if (action) {
                return action;
            }
        }
        return null;
    }
    findActionButtonByKey(actions, actionKey) {
        for (const action of actions) {
            if (action.actionKey === actionKey) {
                return action;
            }
            if (action.subActions?.length) {
                const nestedAction = this.findActionButtonByKey(action.subActions, actionKey);
                if (nestedAction) {
                    return nestedAction;
                }
            }
        }
        return null;
    }
    getMobileCardValue(row, key) {
        if (!key) {
            return '';
        }
        const column = this.columns.find((item) => item.key === key);
        return column ? this.getCellValue(row, column) : this.stringifyCellValue(row[key]);
    }
    getMobileCardTone(row, key) {
        const column = key ? this.columns.find((item) => item.key === key) : undefined;
        if (column) {
            return this.getChipTone(row, column);
        }
        const value = this.getMobileCardValue(row, key).toLowerCase();
        if (value === 'paid' || value.includes('delivered')) {
            return 'success';
        }
        if (value.includes('refund') || value.includes('cancel') || value.includes('failed')) {
            return 'danger';
        }
        if (value.includes('return')) {
            return 'warning';
        }
        if (value.includes('ship') || value.includes('confirm')) {
            return 'info';
        }
        return 'neutral';
    }
    getMobileCardInitials(row) {
        const value = this.getMobileCardValue(row, this.resolveMobileCardHeaderTitleKey(row));
        const words = value.trim().split(/\s+/).filter(Boolean);
        return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '—';
    }
    setMobileSort(column) {
        this.setSort(column);
        this.mobileTableOptionsOpen = false;
    }
    onMobileCardActionClick(event, actionKey, row) {
        event.stopPropagation();
        this.triggerRowAction(actionKey, row);
    }
    handleHeaderKeydown(event, column) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.setSort(column);
        }
    }
    closeColumnPanel() {
        this.columnPanelOpen = false;
    }
    isRowSelected(row, rowIndex) {
        return this.selectedRowKeys.has(this.getRowKey(row, rowIndex));
    }
    areAllDisplayedRowsSelected() {
        if (!this.displayedRows.length) {
            return false;
        }
        return this.displayedRows.every((row, rowIndex) => this.selectedRowKeys.has(this.getRowKey(row, rowIndex)));
    }
    toggleRowSelection(row, rowIndex, selected) {
        if (!this.enableRowSelection) {
            return;
        }
        const key = this.getRowKey(row, rowIndex);
        if (selected) {
            this.selectedRowKeys.add(key);
        }
        else {
            this.selectedRowKeys.delete(key);
        }
        this.emitSelectedRows();
    }
    toggleSelectAllDisplayedRows(selected) {
        if (!this.enableRowSelection) {
            return;
        }
        this.displayedRows.forEach((row, rowIndex) => {
            const key = this.getRowKey(row, rowIndex);
            if (selected) {
                this.selectedRowKeys.add(key);
            }
            else {
                this.selectedRowKeys.delete(key);
            }
        });
        this.emitSelectedRows();
    }
    setMobileViewMode(mode) {
        this.mobileViewMode = mode;
        this.syncMobileLoadMoreObserver();
    }
    onResize() {
        this.updateViewportMode();
        this.scheduleFilterNavigationLayout();
        this.syncMobileLoadMoreObserver();
    }
    onDocumentClick(event) {
        const target = event.target;
        if (this.toolbarOptionsOpen && target && !this.host.nativeElement.querySelector('.gom-table-options')?.contains(target)) {
            this.toolbarOptionsOpen = false;
        }
        if (this.navigationOverflowOpenKey && target) {
            const overflowMenus = this.host.nativeElement.querySelectorAll('.gom-table-filter-navigation__more');
            if (![...overflowMenus].some((menu) => menu.contains(target))) {
                this.navigationOverflowOpenKey = null;
            }
        }
        if (!this.submenuOpenKey) {
            return;
        }
        if (!this.host.nativeElement.contains(event.target)) {
            this.submenuOpenKey = null;
            this.submenuPosition = null;
        }
    }
    onDocumentKeydown(event) {
        if (event.key === 'Escape' && (this.submenuOpenKey || this.toolbarOptionsOpen || this.navigationOverflowOpenKey)) {
            event.preventDefault();
            this.submenuOpenKey = null;
            this.submenuPosition = null;
            this.toolbarOptionsOpen = false;
            this.navigationOverflowOpenKey = null;
        }
    }
    getNextSortDirection(columnKey) {
        const current = this.getSortDirection(columnKey);
        if (current === '') {
            return 'asc';
        }
        if (current === 'asc') {
            return 'desc';
        }
        return '';
    }
    initializeVisibleColumns() {
        if (!this.columns.length) {
            this.visibleColumnKeys.clear();
            return;
        }
        if (this.visibleColumnKeys.size === 0) {
            this.columns
                .filter((column) => !column.hiddenByDefault)
                .forEach((column) => this.visibleColumnKeys.add(column.key));
            return;
        }
        const available = new Set(this.columns.map((column) => column.key));
        for (const key of this.visibleColumnKeys) {
            if (!available.has(key)) {
                this.visibleColumnKeys.delete(key);
            }
        }
        if (this.visibleColumnKeys.size === 0) {
            this.columns.forEach((column) => this.visibleColumnKeys.add(column.key));
        }
    }
    refresh() {
        if (this.dataMode === 'client') {
            this.runClientMode();
        }
        else {
            this.syncServerModeRows();
            this.queryChange.emit(this.buildQuery());
        }
    }
    runClientMode() {
        const result = this.tableService.runClientPipeline(this.rows, this.columns, this.buildQuery(), this.advancedFilterDefinitions);
        this.displayedRows = result.rows;
        this.filteredTotal = result.filteredTotal;
    }
    syncServerModeRows() {
        if (this.isMobileLoadMoreActive() && this.mobileLoadMoreStrategy === 'page-query') {
            const pageChangedWithoutFreshRows = this.pageIndex !== this.lastSyncedServerPageIndex
                && this.rows === this.lastSyncedServerRowsRef;
            if (pageChangedWithoutFreshRows) {
                this.displayedRows = this.accumulatedServerRows.length > 0 ? this.accumulatedServerRows : this.rows;
                this.filteredTotal = this.totalItems;
                return;
            }
            if (this.pageIndex === 0) {
                this.accumulatedServerRows = [...this.rows];
                this.lastAccumulatedPageIndex = 0;
            }
            else if (this.pageIndex === this.lastAccumulatedPageIndex + 1) {
                this.accumulatedServerRows = this.mergeServerRows(this.accumulatedServerRows, this.rows);
                this.lastAccumulatedPageIndex = this.pageIndex;
            }
            else {
                this.accumulatedServerRows = [...this.rows];
                this.lastAccumulatedPageIndex = this.pageIndex;
            }
            this.displayedRows = this.accumulatedServerRows;
            this.filteredTotal = this.totalItems;
            this.lastSyncedServerRowsRef = this.rows;
            this.lastSyncedServerPageIndex = this.pageIndex;
            return;
        }
        this.accumulatedServerRows = [];
        this.lastAccumulatedPageIndex = 0;
        this.lastSyncedServerRowsRef = null;
        this.lastSyncedServerPageIndex = -1;
        this.displayedRows = this.rows;
        this.filteredTotal = this.totalItems;
    }
    isMobileLoadMoreActive() {
        return this.mobileCardView
            && this.mobilePaginationMode === 'load-more'
            && this.isMobileViewport
            && this.mobileViewMode === 'cards';
    }
    mergeServerRows(existingRows, nextRows) {
        const merged = [...existingRows];
        const existingIds = new Set(existingRows
            .map((row) => row['_id'])
            .filter((value) => typeof value === 'string' && value.length > 0));
        nextRows.forEach((row) => {
            const rowId = row['_id'];
            if (typeof rowId === 'string' && rowId.length > 0) {
                if (!existingIds.has(rowId)) {
                    merged.push(row);
                    existingIds.add(rowId);
                }
                return;
            }
            merged.push(row);
        });
        return merged;
    }
    shouldObserveMobileLoadMoreSentinel() {
        return this.mobileAutoLoadMore
            && this.mobilePaginationMode === 'load-more'
            && this.mobileCardView
            && this.showPagination
            && this.isMobileViewport
            && this.mobileViewMode === 'cards';
    }
    syncMobileLoadMoreObserver() {
        this.mobileLoadMoreObserver?.disconnect();
        this.mobileLoadMoreObserver = null;
        this.mobileLoadMoreSentinelInView = false;
        if (typeof IntersectionObserver === 'undefined' || !this.shouldObserveMobileLoadMoreSentinel()) {
            return;
        }
        const sentinel = this.mobileLoadMoreSentinel?.nativeElement;
        if (!sentinel) {
            return;
        }
        this.mobileLoadMoreObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    this.mobileLoadMoreSentinelInView = false;
                    return;
                }
                if (this.mobileLoadMoreSentinelInView) {
                    return;
                }
                this.mobileLoadMoreSentinelInView = true;
                this.maybeAutoLoadMore();
            });
        }, {
            root: null,
            rootMargin: '160px 0px',
            threshold: 0.01,
        });
        this.mobileLoadMoreObserver.observe(sentinel);
    }
    maybeAutoLoadMore() {
        if (!this.shouldObserveMobileLoadMoreSentinel()) {
            return;
        }
        if (!this.canGoNext || this.loading) {
            return;
        }
        const now = Date.now();
        if (now < this.autoLoadMoreCooldownUntil) {
            return;
        }
        this.autoLoadMoreCooldownUntil = now + 500;
        this.requestLoadMore();
    }
    emitPageChange() {
        this.pageChange.emit({ pageIndex: this.pageIndex, pageSize: this.pageSize });
    }
    buildQuery() {
        return {
            searchTerm: this.searchTerm,
            sort: this.sortState,
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
            filters: this.filters,
            visibleColumnKeys: [...this.visibleColumnKeys],
            advancedFilters: this.cloneFilterValues(this.advancedFilters),
            globalSearchScope: this.globalSearchScope,
        };
    }
    stringifyCellValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return JSON.stringify(value);
    }
    formatFilterValue(definition, value) {
        if (Array.isArray(value)) {
            return value.map((item) => definition?.options?.find((option) => option.value === item)?.label ?? item).join(', ');
        }
        if (typeof value === 'object') {
            return [value.from, value.to].filter(Boolean).join(' – ');
        }
        return definition?.options?.find((option) => option.value === value)?.label ?? value;
    }
    hasFilterValue(value) {
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return !!value && (!!value.from || !!value.to);
    }
    cloneFilterValues(values) {
        return Object.fromEntries(Object.entries(values).map(([key, value]) => {
            if (Array.isArray(value)) {
                return [key, [...value]];
            }
            if (value && typeof value === 'object') {
                return [key, { ...value }];
            }
            return [key, value];
        }));
    }
    updateViewportMode() {
        this.isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches;
    }
    observeFilterNavigationRows() {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        this.navigationResizeObserver?.disconnect();
        this.navigationResizeObserver = new ResizeObserver(() => this.scheduleFilterNavigationLayout());
        this.navigationResizeObserver.observe(this.host.nativeElement);
    }
    scheduleFilterNavigationLayout() {
        if (this.navigationLayoutTimer) {
            clearTimeout(this.navigationLayoutTimer);
        }
        this.navigationLayoutTimer = setTimeout(() => {
            this.navigationLayoutTimer = null;
            this.updateFilterNavigationLayout();
        });
    }
    updateFilterNavigationLayout() {
        const nextCounts = {};
        for (const row of this.filterNavigationRows) {
            const container = this.findFilterNavigationElement('data-filter-navigation-options', row.key);
            const options = this.getFilterNavigationOptions(row);
            nextCounts[row.key] = container
                ? this.calculateVisibleNavigationOptionCount(container, row.key, options.length)
                : options.length;
        }
        this.navigationVisibleOptionCounts = nextCounts;
        this.changeDetector.markForCheck();
    }
    calculateVisibleNavigationOptionCount(container, rowKey, optionCount) {
        const renderedOptions = Array.from(container.querySelectorAll('[data-filter-navigation-option]'));
        if (renderedOptions.length === optionCount) {
            this.navigationOptionWidths.set(rowKey, renderedOptions.map((option) => option.getBoundingClientRect().width));
        }
        const widths = this.navigationOptionWidths.get(rowKey);
        if (widths?.length !== optionCount) {
            return optionCount;
        }
        const styles = getComputedStyle(container);
        const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
        const totalWidth = widths.reduce((total, width) => total + width, 0) + gap * Math.max(0, widths.length - 1);
        if (totalWidth <= container.clientWidth) {
            return optionCount;
        }
        const overflowButtonWidth = 44;
        let usedWidth = overflowButtonWidth + gap;
        let visibleCount = 0;
        for (const width of widths) {
            const nextWidth = width + (visibleCount > 0 ? gap : 0);
            if (usedWidth + nextWidth > container.clientWidth) {
                break;
            }
            usedWidth += nextWidth;
            visibleCount += 1;
        }
        return visibleCount;
    }
    findFilterNavigationElement(attribute, key) {
        const elements = this.host.nativeElement.querySelectorAll(`[${attribute}]`);
        return Array.from(elements)
            .find((element) => element.getAttribute(attribute) === key) ?? null;
    }
    clearSelection() {
        this.selectedRowKeys.clear();
        this.emitSelectedRows();
    }
    emitSelectedRows() {
        const selectedRows = this.rows.filter((row, rowIndex) => this.selectedRowKeys.has(this.getRowKey(row, rowIndex)));
        this.selectedRowsChange.emit(selectedRows);
    }
    getRowKey(row, rowIndex) {
        const rowId = row['_id'];
        if (typeof rowId === 'string' || typeof rowId === 'number') {
            return String(rowId);
        }
        return `${this.pageIndex}:${rowIndex}`;
    }
    getSubmenuKey(action, row, rowIndex) {
        const rowId = typeof row['_id'] === 'string' || typeof row['_id'] === 'number'
            ? String(row['_id'])
            : String(rowIndex);
        return `${action.actionKey}::${rowId}`;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTableComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomTableComponent, isStandalone: true, selector: "gom-lib-table", inputs: { columns: "columns", rows: "rows", loading: "loading", dataMode: "dataMode", totalItems: "totalItems", pageSize: "pageSize", pageIndex: "pageIndex", pageSizeOptions: "pageSizeOptions", showPagination: "showPagination", searchPlaceholder: "searchPlaceholder", emptyMessage: "emptyMessage", mobileCardView: "mobileCardView", mobileCardFields: "mobileCardFields", mobileSortKeys: "mobileSortKeys", mobileCardClickable: "mobileCardClickable", mobileCardConfig: "mobileCardConfig", mobilePaginationMode: "mobilePaginationMode", mobileAutoLoadMore: "mobileAutoLoadMore", mobileLoadMoreStrategy: "mobileLoadMoreStrategy", bodyViewportRows: "bodyViewportRows", enableRowSelection: "enableRowSelection", bulkActions: "bulkActions", bulkActionBusyKey: "bulkActionBusyKey", selectionItemLabel: "selectionItemLabel", showSearch: "showSearch", globalSearchScope: "globalSearchScope", searchDebounceMs: "searchDebounceMs", showFilterButton: "showFilterButton", showClearFilterButton: "showClearFilterButton", advancedFilterDefinitions: "advancedFilterDefinitions", filterNavigationRows: "filterNavigationRows", enableColumnSearch: "enableColumnSearch", showColumnSearchInitially: "showColumnSearchInitially", enableColumnVisibility: "enableColumnVisibility", showExport: "showExport", showInlineEditBanner: "showInlineEditBanner", inlineEditBannerCount: "inlineEditBannerCount", inlineEditBannerSummary: "inlineEditBannerSummary", inlineEditBannerDetail: "inlineEditBannerDetail", inlineEditBannerSaveLabel: "inlineEditBannerSaveLabel", inlineEditBannerDiscardLabel: "inlineEditBannerDiscardLabel", inlineEditBannerReviewLabel: "inlineEditBannerReviewLabel", inlineEditBannerSaving: "inlineEditBannerSaving" }, outputs: { queryChange: "queryChange", pageChange: "pageChange", sortChange: "sortChange", filterChange: "filterChange", filterNavigationChange: "filterNavigationChange", columnVisibilityChange: "columnVisibilityChange", rowAction: "rowAction", cellEdit: "cellEdit", rowClick: "rowClick", selectedRowsChange: "selectedRowsChange", bulkAction: "bulkAction", loadMore: "loadMore", exportClick: "exportClick", inlineEditDiscardAll: "inlineEditDiscardAll", inlineEditSaveAll: "inlineEditSaveAll", inlineEditReviewChanges: "inlineEditReviewChanges" }, host: { listeners: { "window:resize": "onResize()", "document:click": "onDocumentClick($event)", "document:keydown": "onDocumentKeydown($event)" }, properties: { "class.gom-table-mobile-card": "mobileCardView", "class.gom-table-mobile-cards-active": "isMobileCardsActive", "class.gom-table-mobile-table-active": "isMobileTableActive", "style.--gom-table-body-max-height": "this.tableBodyMaxHeight" } }, viewQueries: [{ propertyName: "mobileLoadMoreSentinel", first: true, predicate: ["mobileLoadMoreSentinel"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<section class=\"gom-table-shell\">\r\n  <header class=\"gom-table-toolbar\">\r\n    @if (showSearch) {\r\n    <div class=\"gom-table-toolbar__search\" role=\"search\">\r\n      <gom-lib-input\r\n        class=\"gom-table-search\"\r\n        type=\"search\"\r\n        leadingIcon=\"ri-search-line\"\r\n        [clearable]=\"true\"\r\n        ariaLabel=\"Search table\"\r\n        [placeholder]=\"searchPlaceholder\"\r\n        [ngModel]=\"searchTerm\"\r\n        (ngModelChange)=\"setSearchTerm($event)\"\r\n      ></gom-lib-input>\r\n    </div>\r\n    }\r\n\r\n    <div class=\"gom-table-toolbar__actions\">\r\n      @for (filter of toolbarFilterDefinitions; track filter.key) {\r\n        <div class=\"gom-table-quick-filter\">\r\n          @if (filter.type === 'select') {\r\n            <gom-lib-select\r\n              [label]=\"filter.label\"\r\n              [placeholder]=\"filter.placeholder || ('All ' + filter.label)\"\r\n              [options]=\"getFilterOptions(filter)\"\r\n              [searchable]=\"filter.searchable || false\"\r\n              [ngModel]=\"getFilterString(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-select>\r\n          } @else if (filter.type === 'multi-select') {\r\n            <gom-lib-select\r\n              [label]=\"filter.label\"\r\n              [placeholder]=\"filter.placeholder || ('All ' + filter.label)\"\r\n              [options]=\"getFilterOptions(filter)\"\r\n              [multiple]=\"true\"\r\n              [searchable]=\"filter.searchable ?? true\"\r\n              [ngModel]=\"getFilterArray(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-select>\r\n          } @else if (filter.type !== 'date-range') {\r\n            <gom-lib-input\r\n              [label]=\"filter.label\"\r\n              [type]=\"filter.type === 'date' ? 'date' : 'text'\"\r\n              [placeholder]=\"filter.placeholder || filter.label\"\r\n              [ngModel]=\"getFilterString(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-input>\r\n          }\r\n        </div>\r\n      }\r\n\r\n      @if (showFilterButton) {\r\n        <gom-lib-button\r\n          class=\"gom-table-filter-button\"\r\n          [variant]=\"advancedFilterModalOpen || activeFilterCount > 0 ? 'primary' : 'secondary'\"\r\n          size=\"default\"\r\n          [disabled]=\"panelFilterDefinitions.length === 0\"\r\n          (buttonClick)=\"openAdvancedFilters()\"\r\n          [ariaExpanded]=\"advancedFilterModalOpen\"\r\n          ariaHaspopup=\"dialog\"\r\n          [ariaLabel]=\"activeFilterCount ? 'Filters, ' + activeFilterCount + ' active' : 'Filters'\"\r\n          [buttonTitle]=\"panelFilterDefinitions.length ? 'Open filters' : 'No panel filters configured'\"\r\n        >\r\n          <i class=\"ri-equalizer-3-line\" aria-hidden=\"true\"></i>\r\n          <span class=\"gom-table-filter-button__label\">Filter@if (activeFilterCount) { ({{ activeFilterCount }}) }</span>\r\n        </gom-lib-button>\r\n      }\r\n\r\n      @if (showClearFilterButton && activeFilterCount > 0) {\r\n        <gom-lib-button\r\n          class=\"gom-table-icon-button gom-table-clear-filters\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"clearAllFilters()\"\r\n          [ariaLabel]=\"'Clear all ' + activeFilterCount + ' active filters'\"\r\n          buttonTitle=\"Clear all filters\"\r\n        ><i class=\"ri-filter-off-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n      }\r\n\r\n      @if (showToolbarOptions) {\r\n        <div class=\"gom-table-options\" #tableOptionsBoundary>\r\n          <core-lib-menu\r\n            #toolbarOptionsMenu\r\n            [menuType]=\"'submenu'\"\r\n            [outsideClickBoundary]=\"tableOptionsBoundary\"\r\n            [menuList]=\"toolbarOptionsMenuList\"\r\n            [showMenuListArrow]=\"false\"\r\n            [showMobileBackArrow]=\"false\"\r\n            [backButtonText]=\"'Table options'\"\r\n          ></core-lib-menu>\r\n\r\n          <gom-lib-button\r\n            class=\"gom-table-icon-button gom-table-options-button\"\r\n            variant=\"secondary\"\r\n            [size]=\"isMobileViewport ? 'default' : 'icon'\"\r\n            (buttonClick)=\"isMobileViewport ? openMobileTableOptions() : toolbarOptionsMenu.toggle()\"\r\n            [ariaLabel]=\"isMobileViewport ? 'Sort and table options' : (isMobileViewport && mobileViewMode === 'cards' ? 'List options' : 'Table options')\"\r\n            [buttonTitle]=\"isMobileViewport ? 'Sort and table options' : (isMobileViewport && mobileViewMode === 'cards' ? 'List options' : 'Table options')\"\r\n            ariaHaspopup=\"menu\"\r\n            [ariaExpanded]=\"isMobileViewport ? mobileTableOptionsOpen : null\"\r\n          >\r\n            <i [class]=\"isMobileViewport ? 'ri-equalizer-line' : 'ri-more-2-fill'\" aria-hidden=\"true\"></i>\r\n            @if (isMobileViewport) {\r\n              <span class=\"gom-table-options-button__label\">{{ mobileSortButtonLabel }}</span>\r\n            }\r\n          </gom-lib-button>\r\n        </div>\r\n      }\r\n\r\n      @if (showMobileViewToggle) {\r\n        <fieldset class=\"gom-table-mobile-toggle\">\r\n          <legend>Mobile results view</legend>\r\n          <gom-lib-button\r\n            [variant]=\"mobileViewMode === 'cards' ? 'primary' : 'ghost'\"\r\n            size=\"compact-icon\"\r\n            ariaLabel=\"Show list view\"\r\n            buttonTitle=\"List view\"\r\n            (buttonClick)=\"setMobileViewMode('cards')\"\r\n          ><i class=\"ri-list-check-2\" aria-hidden=\"true\"></i></gom-lib-button>\r\n          <gom-lib-button\r\n            [variant]=\"mobileViewMode === 'table' ? 'primary' : 'ghost'\"\r\n            size=\"compact-icon\"\r\n            ariaLabel=\"Show table view\"\r\n            buttonTitle=\"Table view\"\r\n            (buttonClick)=\"setMobileViewMode('table')\"\r\n          ><i class=\"ri-table-2\" aria-hidden=\"true\"></i></gom-lib-button>\r\n        </fieldset>\r\n      }\r\n\r\n      @if (columnPanelOpen && !isMobileViewport) {\r\n        <section class=\"gom-table-panel\">\r\n          <header class=\"gom-table-panel__header\">\r\n            <h3>Columns</h3>\r\n            <gom-lib-button class=\"gom-table-panel__close\" variant=\"secondary\" (buttonClick)=\"closeColumnPanel()\">Close</gom-lib-button>\r\n          </header>\r\n\r\n          <div class=\"gom-table-panel__body\">\r\n            @for (column of columns; track column.key) {\r\n              <label class=\"checkbox-row\">\r\n                <input\r\n                  type=\"checkbox\"\r\n                  [checked]=\"visibleColumnKeys.has(column.key)\"\r\n                  [disabled]=\"column.hideable === false || (visibleColumnKeys.size === 1 && visibleColumnKeys.has(column.key))\"\r\n                  (change)=\"toggleColumn(column.key)\"\r\n                />\r\n                <span>{{ column.header }}</span>\r\n              </label>\r\n            }\r\n          </div>\r\n        </section>\r\n      }\r\n    </div>\r\n  </header>\r\n\r\n  @if (appliedFilterChips.length > 0) {\r\n    <section class=\"gom-table-applied-filters\" aria-label=\"Applied filters\">\r\n      <div class=\"gom-table-applied-filters__chips\">\r\n        @for (filter of appliedFilterChips; track filter.key) {\r\n          <button\r\n            type=\"button\"\r\n            class=\"gom-table-applied-filter\"\r\n            (click)=\"removeAppliedFilter(filter.key)\"\r\n            [attr.aria-label]=\"'Remove ' + filter.label + ' filter'\"\r\n          >{{ filter.label }}: {{ filter.displayValue }} <i class=\"ri-close-circle-line\" aria-hidden=\"true\"></i></button>\r\n        }\r\n        <button type=\"button\" class=\"gom-table-applied-filters__clear\" (click)=\"clearAllFilters()\">Clear All</button>\r\n      </div>\r\n      <span class=\"gom-table-applied-filters__summary\">\r\n        {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} applied \u2022 {{ paginationTotal }} results found\r\n      </span>\r\n    </section>\r\n  }\r\n\r\n  @if (filterNavigationRows.length > 0) {\r\n    <nav class=\"gom-table-filter-navigation\" aria-label=\"Table filters\">\r\n      @for (row of filterNavigationRows; track row.key) {\r\n        <div\r\n          class=\"gom-table-filter-navigation__row\"\r\n          role=\"tablist\"\r\n          [attr.aria-label]=\"row.label || row.key\"\r\n          [attr.data-filter-navigation-row]=\"row.key\"\r\n          (keydown)=\"onFilterNavigationKeydown($event, row.key)\"\r\n        >\r\n          @if (row.label) {\r\n            <span class=\"gom-table-filter-navigation__label\" aria-hidden=\"true\">{{ row.label }}</span>\r\n          }\r\n\r\n          <div\r\n            class=\"gom-table-filter-navigation__options\"\r\n            [attr.data-filter-navigation-options]=\"row.key\"\r\n          >\r\n            @for (option of (isMobileViewport ? getFilterNavigationOptions(row) : getVisibleFilterNavigationOptions(row)); track option.value) {\r\n              <gom-lib-chip\r\n                class=\"gom-table-filter-navigation__option\"\r\n                [class.gom-table-filter-navigation__option--selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                data-filter-navigation-option\r\n                [interactive]=\"true\"\r\n                size=\"compact\"\r\n                [selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                [disabled]=\"option.disabled || false\"\r\n                ariaRole=\"tab\"\r\n                [ariaLabel]=\"option.label\"\r\n                (chipClick)=\"selectFilterNavigationOption(row, option)\"\r\n              >\r\n                <span class=\"gom-table-filter-navigation__option-label\">{{ option.label }}</span>\r\n                @if (row.showCounts && option.count !== undefined) {\r\n                  <span class=\"gom-table-filter-navigation__count\">{{ option.count }}</span>\r\n                }\r\n              </gom-lib-chip>\r\n            }\r\n\r\n            @if (!isMobileViewport && getOverflowFilterNavigationOptions(row).length > 0) {\r\n              <div class=\"gom-table-filter-navigation__more\">\r\n                <gom-lib-button\r\n                  class=\"gom-table-icon-button\"\r\n                  size=\"icon\"\r\n                  [variant]=\"navigationOverflowOpenKey === row.key || hasActiveOverflowFilterNavigationOption(row) ? 'primary' : 'secondary'\"\r\n                  (buttonClick)=\"toggleFilterNavigationOverflow($event, row.key)\"\r\n                  ariaLabel=\"More filter options\"\r\n                  buttonTitle=\"More filter options\"\r\n                  ariaHaspopup=\"menu\"\r\n                  [ariaExpanded]=\"navigationOverflowOpenKey === row.key\"\r\n                ><i class=\"ri-more-2-fill\" aria-hidden=\"true\"></i></gom-lib-button>\r\n\r\n                @if (navigationOverflowOpenKey === row.key) {\r\n                  <div class=\"gom-table-filter-navigation__menu\" role=\"menu\">\r\n                    @for (option of getOverflowFilterNavigationOptions(row); track option.value) {\r\n                      <gom-lib-chip\r\n                        class=\"gom-table-filter-navigation__menu-item\"\r\n                        [class.gom-table-filter-navigation__option--selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                        [interactive]=\"true\"\r\n                        size=\"compact\"\r\n                        [fullWidth]=\"true\"\r\n                        [selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                        [disabled]=\"option.disabled || false\"\r\n                        ariaRole=\"menuitemradio\"\r\n                        [ariaLabel]=\"option.label\"\r\n                        (chipClick)=\"selectFilterNavigationOption(row, option)\"\r\n                      >\r\n                        <span>{{ option.label }}</span>\r\n                        @if (row.showCounts && option.count !== undefined) {\r\n                          <span class=\"gom-table-filter-navigation__count\">{{ option.count }}</span>\r\n                        }\r\n                      </gom-lib-chip>\r\n                    }\r\n                  </div>\r\n                }\r\n              </div>\r\n            }\r\n          </div>\r\n        </div>\r\n      }\r\n    </nav>\r\n  }\r\n\r\n  <div class=\"gom-table-mobile-result-bar\">\r\n    @if (activeFilterCount > 0) {\r\n      <strong>{{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} applied</strong>\r\n      <span aria-hidden=\"true\">\u2022</span>\r\n    }\r\n    <span>Showing {{ paginationRangeStart }}-{{ paginationRangeEnd }} of {{ paginationTotal }} {{ selectionItemLabel }}{{ paginationTotal === 1 ? '' : 's' }}</span>\r\n  </div>\r\n\r\n  @if (enableRowSelection && hasSelectedRows) {\r\n    <section class=\"gom-table-bulk-actions\" aria-live=\"polite\" aria-label=\"Selected rows actions\">\r\n      <div class=\"gom-table-bulk-actions__summary\">\r\n        <i class=\"ri-checkbox-circle-fill\" aria-hidden=\"true\"></i>\r\n        <strong>{{ selectionSummary }}</strong>\r\n      </div>\r\n\r\n      <div class=\"gom-table-bulk-actions__controls\">\r\n        @for (action of visibleBulkActions; track action.actionKey) {\r\n          <gom-lib-button\r\n            [variant]=\"action.variant || 'secondary'\"\r\n            [disabled]=\"isBulkActionDisabled(action)\"\r\n            [buttonTitle]=\"getBulkActionTitle(action)\"\r\n            (buttonClick)=\"triggerBulkAction(action)\"\r\n          >\r\n            @if (action.icon) {\r\n              <i [class]=\"action.icon\" aria-hidden=\"true\"></i>\r\n            }\r\n            {{ bulkActionBusyKey === action.actionKey ? 'Working...' : action.label }}\r\n          </gom-lib-button>\r\n        }\r\n\r\n        <gom-lib-button\r\n          class=\"gom-table-bulk-actions__clear\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          [disabled]=\"bulkActionBusyKey !== null\"\r\n          ariaLabel=\"Clear row selection\"\r\n          buttonTitle=\"Clear selection\"\r\n          (buttonClick)=\"clearSelectedRows()\"\r\n        ><i class=\"ri-close-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n      </div>\r\n    </section>\r\n  }\r\n\r\n  @if (showInlineEditBanner) {\r\n    <section class=\"gom-table-inline-edit-banner\" aria-live=\"polite\" aria-label=\"Pending inline edit changes\">\r\n      <div class=\"gom-table-inline-edit-banner__summary\">\r\n        @if (inlineEditBannerCount > 0) {\r\n          <span class=\"gom-table-inline-edit-banner__count\">{{ inlineEditBannerCount }}</span>\r\n        }\r\n        <strong>{{ inlineEditBannerSummary }}</strong>\r\n        @if (inlineEditBannerDetail) {\r\n          <span>{{ inlineEditBannerDetail }}</span>\r\n        }\r\n      </div>\r\n\r\n      <div class=\"gom-table-inline-edit-banner__actions\">\r\n        <gom-lib-button\r\n          variant=\"secondary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditDiscardAll.emit()\"\r\n        >{{ inlineEditBannerDiscardLabel }}</gom-lib-button>\r\n\r\n        <gom-lib-button\r\n          variant=\"secondary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditSaveAll.emit()\"\r\n        >{{ inlineEditBannerSaving ? 'Saving...' : inlineEditBannerSaveLabel }}</gom-lib-button>\r\n\r\n        <gom-lib-button\r\n          variant=\"primary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditReviewChanges.emit()\"\r\n        >{{ inlineEditBannerReviewLabel }}</gom-lib-button>\r\n      </div>\r\n    </section>\r\n  }\r\n\r\n  <div class=\"gom-table-wrap\">\r\n    <table class=\"gom-table\">\r\n      <thead>\r\n        <tr>\r\n          @if (enableRowSelection) {\r\n            <th scope=\"col\" class=\"gom-table-selection-col\">\r\n              <input\r\n                type=\"checkbox\"\r\n                [checked]=\"areAllDisplayedRowsSelected()\"\r\n                [disabled]=\"loading || displayedRows.length === 0\"\r\n                (change)=\"toggleSelectAllDisplayedRows($any($event.target).checked)\"\r\n                aria-label=\"Select all rows\"\r\n              />\r\n            </th>\r\n          }\r\n          @for (column of visibleColumns; track column.key) {\r\n            <th\r\n              scope=\"col\"\r\n              [style.width]=\"column.width\"\r\n              [class]=\"'align-' + getHeaderAlign(column)\"\r\n              [class.gom-table-header--actions]=\"hasActionButtons(column)\"\r\n              [class.sortable]=\"column.sortable\"\r\n              [attr.tabindex]=\"column.sortable ? 0 : null\"\r\n              [attr.role]=\"column.sortable ? 'button' : null\"\r\n              (click)=\"setSort(column)\"\r\n              (keydown)=\"handleHeaderKeydown($event, column)\"\r\n            >\r\n              <span>{{ column.header }}</span>\r\n              @if (column.sortable && getSortDirection(column.key)) {\r\n                <span class=\"sort-indicator\" aria-hidden=\"true\">\r\n                  @if (getSortDirection(column.key) === 'asc') {\r\n                    <i class=\"ri-arrow-up-s-line\"></i>\r\n                  }\r\n                  @if (getSortDirection(column.key) === 'desc') {\r\n                    <i class=\"ri-arrow-down-s-line\"></i>\r\n                  }\r\n                </span>\r\n              }\r\n            </th>\r\n          }\r\n        </tr>\r\n\r\n        @if (hasInlineFilters) {\r\n          <tr class=\"gom-table-filter-row\">\r\n            @if (enableRowSelection) {\r\n              <th scope=\"col\" class=\"gom-table-selection-col\"></th>\r\n            }\r\n            @for (column of visibleColumns; track column.key) {\r\n              <th scope=\"col\">\r\n                @if (column.filterable) {\r\n                  <gom-lib-input\r\n                    class=\"gom-table-column-filter\"\r\n                    type=\"search\"\r\n                    [placeholder]=\"'Search ' + column.header\"\r\n                    [id]=\"'filter-' + column.key\"\r\n                    [ngModel]=\"filters[column.key] || ''\"\r\n                    (click)=\"$event.stopPropagation()\"\r\n                    (keydown)=\"$event.stopPropagation()\"\r\n                    (ngModelChange)=\"setFilter(column.key, $event)\"\r\n                  ></gom-lib-input>\r\n                } @else {\r\n                  <span class=\"gom-table-filter-spacer\"></span>\r\n                }\r\n              </th>\r\n            }\r\n          </tr>\r\n        }\r\n      </thead>\r\n\r\n      <tbody>\r\n        @if (loading) {\r\n          @for (skeletonRow of skeletonRows; track skeletonRow) {\r\n            <tr class=\"gom-table-skeleton-row\">\r\n              @if (enableRowSelection) {\r\n                <td class=\"gom-table-selection-col gom-table-skeleton-cell\">\r\n                  <span class=\"gom-table-skeleton-box\"></span>\r\n                </td>\r\n              }\r\n              @for (column of visibleColumns; track column.key) {\r\n                <td class=\"gom-table-skeleton-cell\">\r\n                  <span class=\"gom-table-skeleton-line\"></span>\r\n                </td>\r\n              }\r\n            </tr>\r\n          }\r\n        } @else if (displayedRows.length === 0) {\r\n          <tr>\r\n            <td [attr.colspan]=\"visibleColumns.length + (enableRowSelection ? 1 : 0)\" class=\"state-cell\">{{ emptyMessage }}</td>\r\n          </tr>\r\n        } @else {\r\n          @for (row of displayedRows; track trackByRow($index); let rowIndex = $index) {\r\n            <tr>\r\n              @if (enableRowSelection) {\r\n                <td class=\"gom-table-selection-col\">\r\n                  <input\r\n                    type=\"checkbox\"\r\n                    [checked]=\"isRowSelected(row, rowIndex)\"\r\n                    (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n                    [attr.aria-label]=\"'Select row ' + (rowIndex + 1)\"\r\n                  />\r\n                </td>\r\n              }\r\n              @for (column of visibleColumns; track column.key) {\r\n                <td\r\n                  [class]=\"'align-' + getCellAlign(column) + ' text-' + getTextMode(column) + ' ' + getCellClass(row, column)\"\r\n                  [class.gom-table-cell--actions]=\"hasActionButtons(column)\"\r\n                  [class.gom-table-cell--editable]=\"!!getEditableConfig(column)\"\r\n                  [class.gom-table-cell--editing]=\"isCellEditing(row, column)\"\r\n                  [attr.title]=\"isCellEditing(row, column) ? null : getCellTitle(row, column)\"\r\n                >\r\n                  @if (hasActionButtons(column)) {\r\n                    <div class=\"gom-table-actions\">\r\n                      @for (action of getInlineActionButtons(column); track action.actionKey) {\r\n                        @if (getSubActions(action).length > 0) {\r\n                          <div class=\"gom-table-action-menu\" [class.gom-table-action-menu--open]=\"isSubmenuOpen(action, row, rowIndex)\">\r\n                            <gom-lib-button\r\n                              class=\"gom-table-actions__button\"\r\n                              [variant]=\"action.variant || 'secondary'\"\r\n                              size=\"icon\"\r\n                              [disabled]=\"isActionDisabled(action, row)\"\r\n                              [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                              [attr.title]=\"getActionTitle(action, row)\"\r\n                              (buttonClick)=\"toggleSubmenu($event, action, row, rowIndex)\"\r\n                            >\r\n                              @if (getActionIcon(action, row); as iconClass) {\r\n                                <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                              } @else {\r\n                                <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                              }\r\n                            </gom-lib-button>\r\n\r\n                            @if (isSubmenuOpen(action, row, rowIndex)) {\r\n                              <div class=\"gom-table-submenu\" [ngStyle]=\"submenuPosition\" (click)=\"$event.stopPropagation()\">\r\n                                @for (subAction of getSubActions(action); track subAction.actionKey) {\r\n                                  <gom-lib-button\r\n                                    class=\"gom-table-submenu__item\"\r\n                                    [variant]=\"subAction.variant || 'secondary'\"\r\n                                    [disabled]=\"isActionDisabled(subAction, row)\"\r\n                                    [attr.title]=\"getActionTitle(subAction, row)\"\r\n                                    (buttonClick)=\"onSubmenuActionClick($event, subAction.actionKey, row)\"\r\n                                  >\r\n                                    {{ getActionLabel(subAction, row) }}\r\n                                  </gom-lib-button>\r\n                                }\r\n                              </div>\r\n                            }\r\n                          </div>\r\n                        } @else {\r\n                          <span [attr.title]=\"isActionDisabled(action, row) ? getActionTitle(action, row) : null\" style=\"display:inline-flex;\">\r\n                          <gom-lib-button\r\n                            class=\"gom-table-actions__button\"\r\n                            [variant]=\"action.variant || 'secondary'\"\r\n                            size=\"icon\"\r\n                            [disabled]=\"isActionDisabled(action, row)\"\r\n                            [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                            [attr.title]=\"isActionDisabled(action, row) ? null : getActionTitle(action, row)\"\r\n                            (buttonClick)=\"triggerRowAction(action.actionKey, row)\"\r\n                          >\r\n                            @if (getActionIcon(action, row); as iconClass) {\r\n                              <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                            } @else {\r\n                              <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                            }\r\n                          </gom-lib-button>\r\n                          </span>\r\n                        }\r\n                      }\r\n\r\n                      @if (hasOverflowMenu(column)) {\r\n                        <div class=\"gom-table-action-overflow\" #actionOverflowBoundary>\r\n                          <core-lib-menu\r\n                            #actionOverflowMenu\r\n                            [menuType]=\"'submenu'\"\r\n                            [outsideClickBoundary]=\"actionOverflowBoundary\"\r\n                            [menuList]=\"getOverflowMenuList(column, row)\"\r\n                            [showMenuListArrow]=\"false\"\r\n                            [showMobileBackArrow]=\"false\"\r\n                            [backButtonText]=\"getOverflowMenuBackButtonText(column)\"\r\n                          ></core-lib-menu>\r\n\r\n                          <gom-lib-button\r\n                            class=\"gom-table-actions__button\"\r\n                            variant=\"secondary\"\r\n                            size=\"icon\"\r\n                            [ariaLabel]=\"getOverflowMenuTriggerAriaLabel(column)\"\r\n                            [buttonTitle]=\"getOverflowMenuTriggerTitle(column)\"\r\n                            (buttonClick)=\"actionOverflowMenu.toggle()\"\r\n                          >\r\n                            <i [class]=\"getOverflowMenuTriggerIcon(column)\" aria-hidden=\"true\"></i>\r\n                          </gom-lib-button>\r\n                        </div>\r\n                      }\r\n                    </div>\r\n                  } @else if (getEditableConfig(column)) {\r\n                    @if (isCellEditing(row, column)) {\r\n                      <gom-lib-input\r\n                        class=\"gom-table-cell-editor\"\r\n                        [type]=\"getCellEditInputType(column)\"\r\n                        [inputmode]=\"getCellEditInputMode(column)\"\r\n                        [min]=\"getEditableConfig(column)?.min\"\r\n                        [max]=\"getEditableConfig(column)?.max\"\r\n                        [step]=\"getEditableConfig(column)?.step\"\r\n                        [disabled]=\"isCellEditDisabled(row, column)\"\r\n                        [ariaLabel]=\"'Edit ' + column.header\"\r\n                        [error]=\"getCellEditError(row, column)\"\r\n                        [ngModel]=\"getCellDraft(row, column)\"\r\n                        (ngModelChange)=\"setCellDraft(row, column, $event)\"\r\n                        (keydown)=\"onCellEditorKeydown($event, row, column)\"\r\n                        (focusout)=\"commitCellEdit(row, column)\"\r\n                        (click)=\"$event.stopPropagation()\"\r\n                      ></gom-lib-input>\r\n                    } @else if (!isCellEditDisabled(row, column)) {\r\n                      <button\r\n                        type=\"button\"\r\n                        class=\"gom-table-cell-edit-trigger\"\r\n                        [attr.aria-label]=\"'Edit ' + column.header + ': ' + getCellValue(row, column)\"\r\n                        (click)=\"startCellEdit($event, row, column)\"\r\n                        (keydown)=\"onCellEditTriggerKeydown($event, row, column)\"\r\n                      >{{ getCellValue(row, column) }}</button>\r\n                    } @else {\r\n                      {{ getCellValue(row, column) }}\r\n                    }\r\n                  } @else {\r\n                    @if (getCellActionKey(row, column); as cellActionKey) {\r\n                      <button\r\n                        type=\"button\"\r\n                        class=\"gom-table-cell-action\"\r\n                        [class.gom-table-cell-action--chip]=\"!!column.chipTone\"\r\n                        [attr.title]=\"getCellTitle(row, column)\"\r\n                        (click)=\"onCellActionClick($event, cellActionKey, row)\"\r\n                        (keydown)=\"onCellActionKeydown($event, cellActionKey, row)\"\r\n                      >\r\n                        @if (column.chipTone) {\r\n                          <gom-lib-chip [tone]=\"getChipTone(row, column)\">{{ getCellValue(row, column) }}</gom-lib-chip>\r\n                        } @else {\r\n                          <span>{{ getCellValue(row, column) }}</span>\r\n                          @if (getCellActionIcon(row, column); as cellActionIcon) {\r\n                            <i [class]=\"cellActionIcon\" class=\"gom-table-cell-action__icon\" aria-hidden=\"true\"></i>\r\n                          }\r\n                        }\r\n                      </button>\r\n                    } @else {\r\n                      @if (column.chipTone) {\r\n                        <gom-lib-chip [tone]=\"getChipTone(row, column)\">{{ getCellValue(row, column) }}</gom-lib-chip>\r\n                      } @else {\r\n                        {{ getCellValue(row, column) }}\r\n                      }\r\n                    }\r\n                  }\r\n                </td>\r\n              }\r\n            </tr>\r\n          }\r\n        }\r\n      </tbody>\r\n    </table>\r\n  </div>\r\n\r\n  @if (showPagination) {\r\n    <footer class=\"gom-table-footer\">\r\n      <div class=\"gom-table-footer__summary\" aria-live=\"polite\">\r\n        Showing <strong>{{ paginationRangeStart }}</strong> to <strong>{{ paginationRangeEnd }}</strong>\r\n        of <strong>{{ paginationTotal }}</strong> {{ selectionItemLabel }}{{ paginationTotal === 1 ? '' : 's' }}\r\n      </div>\r\n\r\n      <nav class=\"gom-table-pagination\" aria-label=\"Table pagination\">\r\n        <gom-lib-button\r\n          class=\"gom-table-pager-button\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"previousPage()\"\r\n          [disabled]=\"!canGoPrevious\"\r\n          ariaLabel=\"Previous page\"\r\n          buttonTitle=\"Previous page\"\r\n        >\r\n          <i class=\"ri-arrow-left-s-line\" aria-hidden=\"true\"></i>\r\n        </gom-lib-button>\r\n\r\n        <div class=\"gom-table-pagination__pages\">\r\n          @for (item of paginationItems; track item) {\r\n            @if (typeof item === 'number') {\r\n              <gom-lib-button\r\n                class=\"gom-table-page-button\"\r\n                [variant]=\"item === pageIndex + 1 ? 'primary' : 'secondary'\"\r\n                [ariaCurrent]=\"item === pageIndex + 1 ? 'page' : null\"\r\n                [ariaLabel]=\"'Page ' + item\"\r\n                [buttonTitle]=\"'Go to page ' + item\"\r\n                (buttonClick)=\"goToPage(item)\"\r\n              >{{ item }}</gom-lib-button>\r\n            } @else {\r\n              <span class=\"gom-table-pagination__ellipsis\" aria-hidden=\"true\">&hellip;</span>\r\n            }\r\n          }\r\n        </div>\r\n\r\n        <gom-lib-button\r\n          class=\"gom-table-pager-button\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"nextPage()\"\r\n          [disabled]=\"!canGoNext\"\r\n          ariaLabel=\"Next page\"\r\n          buttonTitle=\"Next page\"\r\n        >\r\n          <i class=\"ri-arrow-right-s-line\" aria-hidden=\"true\"></i>\r\n        </gom-lib-button>\r\n\r\n        <gom-lib-select\r\n          class=\"gom-table-page-size-select\"\r\n          ariaLabel=\"Rows per page\"\r\n          [placeholder]=\"'Show ' + pageSize\"\r\n          [options]=\"pageSizeSelectOptions\"\r\n          [ngModel]=\"pageSizeModel\"\r\n          (ngModelChange)=\"onPageSizeSelectChange($event)\"\r\n        ></gom-lib-select>\r\n      </nav>\r\n    </footer>\r\n  }\r\n</section>\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"advancedFilterModalOpen\"\r\n  title=\"Filters\"\r\n  size=\"large\"\r\n  mobilePresentation=\"fullscreen\"\r\n  headerActionLabel=\"Reset All\"\r\n  (headerAction)=\"clearDraftAdvancedFilters()\"\r\n  [closeOnBackdropClick]=\"true\"\r\n  (closed)=\"closeAdvancedFilters()\"\r\n>\r\n  <div class=\"gom-table-advanced-filters\">\r\n    @for (filter of panelFilterDefinitions; track filter.key) {\r\n      @if (isMobileViewport && (filter.mobileControl === 'checkboxes' || filter.mobileControl === 'chips' || filter.mobileControl === 'radio')) {\r\n        <fieldset class=\"gom-table-mobile-filter-group\" [class.gom-table-mobile-filter-group--chips]=\"filter.mobileControl === 'chips'\">\r\n          <legend>{{ filter.label }}</legend>\r\n          <div class=\"gom-table-mobile-filter-options\">\r\n            @for (option of getFilterOptions(filter); track option.value) {\r\n              <label\r\n                class=\"gom-table-mobile-filter-option\"\r\n                [class.gom-table-mobile-filter-option--selected]=\"isDraftOptionSelected(filter.key, option.value)\"\r\n              >\r\n                <input\r\n                  [type]=\"filter.mobileControl === 'checkboxes' ? 'checkbox' : 'radio'\"\r\n                  [name]=\"'mobile-filter-' + filter.key\"\r\n                  [checked]=\"isDraftOptionSelected(filter.key, option.value)\"\r\n                  (change)=\"toggleDraftFilterOption(filter, option.value)\"\r\n                />\r\n                <span>{{ option.label }}</span>\r\n                @if (getFilterOptionCount(filter, option.value); as count) {\r\n                  <small>({{ count }})</small>\r\n                }\r\n              </label>\r\n            }\r\n          </div>\r\n        </fieldset>\r\n      } @else if (filter.type === 'text') {\r\n        <gom-lib-input\r\n          [label]=\"filter.label\"\r\n          type=\"text\"\r\n          [placeholder]=\"filter.placeholder || filter.label\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-input>\r\n      } @else if (filter.type === 'date') {\r\n        <gom-lib-input\r\n          [label]=\"filter.label\"\r\n          type=\"date\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-input>\r\n      } @else if (filter.type === 'select') {\r\n        <gom-lib-select\r\n          [label]=\"filter.label\"\r\n          [placeholder]=\"filter.placeholder || ('Select ' + filter.label)\"\r\n          [options]=\"getFilterOptions(filter)\"\r\n          [searchable]=\"filter.searchable || false\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-select>\r\n      } @else if (filter.type === 'multi-select') {\r\n        <gom-lib-select\r\n          [label]=\"filter.label\"\r\n          [placeholder]=\"filter.placeholder || ('Select ' + filter.label)\"\r\n          [options]=\"getFilterOptions(filter)\"\r\n          [multiple]=\"true\"\r\n          [searchable]=\"filter.searchable ?? true\"\r\n          [ngModel]=\"getFilterArray(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-select>\r\n      } @else if (filter.type === 'date-range') {\r\n        <fieldset class=\"gom-table-date-range\">\r\n          <legend>{{ filter.label }}</legend>\r\n          <gom-lib-input\r\n            label=\"From\"\r\n            type=\"date\"\r\n            [ngModel]=\"getFilterRange(draftAdvancedFilters, filter.key).from\"\r\n            (ngModelChange)=\"setDraftDateRangeValue(filter.key, 'from', $event)\"\r\n          ></gom-lib-input>\r\n          <gom-lib-input\r\n            label=\"To\"\r\n            type=\"date\"\r\n            [ngModel]=\"getFilterRange(draftAdvancedFilters, filter.key).to\"\r\n            (ngModelChange)=\"setDraftDateRangeValue(filter.key, 'to', $event)\"\r\n          ></gom-lib-input>\r\n        </fieldset>\r\n      }\r\n    } @empty {\r\n      <p class=\"gom-table-advanced-filters__empty\">No filters are configured for this table.</p>\r\n    }\r\n  </div>\r\n\r\n  <footer class=\"gom-table-filter-actions\" gom-modal-actions>\r\n    <span class=\"gom-table-filter-actions__summary\">{{ draftAdvancedFilterCount }} filters selected</span>\r\n    <div class=\"gom-table-filter-actions__end\">\r\n      <gom-lib-button type=\"button\" variant=\"secondary\" (buttonClick)=\"closeAdvancedFilters()\">Cancel</gom-lib-button>\r\n      <gom-lib-button class=\"gom-table-filter-actions__apply\" type=\"button\" variant=\"primary\" (buttonClick)=\"applyAdvancedFilters()\">Apply filters ({{ draftAdvancedFilterCount }})</gom-lib-button>\r\n    </div>\r\n  </footer>\r\n</gom-lib-modal>\r\n\r\n@if (mobileCardView) {\r\n  <section class=\"gom-card-list\">\r\n    @if (loading) {\r\n      @for (skeletonRow of skeletonRows; track skeletonRow) {\r\n        <gom-lib-card class=\"gom-card-item gom-card-item--skeleton\" [contentGap]=\"false\" aria-hidden=\"true\">\r\n          <div class=\"gom-card__skeleton-line gom-card__skeleton-line--title\"></div>\r\n          <div class=\"gom-card__skeleton-line\"></div>\r\n          <div class=\"gom-card__skeleton-line gom-card__skeleton-line--wide\"></div>\r\n        </gom-lib-card>\r\n      }\r\n    } @else if (displayedRows.length === 0) {\r\n      <gom-lib-card>\r\n        <p class=\"gom-card__state\">{{ emptyMessage }}</p>\r\n      </gom-lib-card>\r\n    } @else {\r\n      @for (row of displayedRows; track trackByRow($index); let rowIndex = $index) {\r\n        <gom-lib-card\r\n          class=\"gom-card-item\"\r\n          [contentGap]=\"false\"\r\n          [class.gom-card-item--clickable]=\"mobileCardClickable\"\r\n          [class.gom-card-item--selected]=\"isRowSelected(row, rowIndex)\"\r\n          (click)=\"onMobileCardClick(row)\"\r\n          (keydown.enter)=\"onMobileCardClick(row)\"\r\n        >\r\n          @if (mobileCardConfig) {\r\n            <div class=\"gom-card__config\">\r\n              <div class=\"gom-card__header\">\r\n                @if (enableRowSelection) {\r\n                  <label class=\"gom-card__checkbox\">\r\n                    <input\r\n                      type=\"checkbox\"\r\n                      [checked]=\"isRowSelected(row, rowIndex)\"\r\n                      (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n                      [attr.aria-label]=\"'Select ' + getMobileCardTitle(row, rowIndex)\"\r\n                    />\r\n                  </label>\r\n                }\r\n\r\n                <div class=\"gom-card__identity gom-card__identity--stacked\">\r\n                  <div>\r\n                    <strong class=\"gom-card__primary\">{{ getMobileCardTitle(row, rowIndex) }}</strong>\r\n                    @if (getMobileCardSubtitleParts(row).length > 0) {\r\n                      <small class=\"gom-card__subtitle\">\r\n                        @for (part of getMobileCardSubtitleParts(row); track part; let last = $last) {\r\n                          <span>{{ part }}</span>\r\n                          @if (!last) {\r\n                            <span class=\"gom-card__subtitle-separator\" aria-hidden=\"true\">\u2022</span>\r\n                          }\r\n                        }\r\n                      </small>\r\n                    }\r\n                  </div>\r\n                </div>\r\n\r\n                @if (hasMobileCardStatus(row)) {\r\n                  <gom-lib-chip class=\"gom-card__status-chip\" size=\"dense\" [tone]=\"getMobileCardStatusTone(row)\">\r\n                    {{ getMobileCardStatusLabel(row) }}\r\n                  </gom-lib-chip>\r\n                }\r\n\r\n                @if (getMobileCardOverflowActions(row).length > 0) {\r\n                  <div class=\"gom-card__overflow\" #cardOverflowBoundary>\r\n                    <core-lib-menu\r\n                      #cardOverflowMenu\r\n                      [menuType]=\"'submenu'\"\r\n                      [outsideClickBoundary]=\"cardOverflowBoundary\"\r\n                      [menuList]=\"getMobileCardOverflowMenuList(row)\"\r\n                      [showMenuListArrow]=\"false\"\r\n                      [showMobileBackArrow]=\"false\"\r\n                      [backButtonText]=\"'Actions'\"\r\n                    ></core-lib-menu>\r\n\r\n                    <gom-lib-button\r\n                      class=\"gom-card__menu-trigger\"\r\n                      variant=\"ghost\"\r\n                      size=\"compact-icon\"\r\n                      ariaLabel=\"More actions\"\r\n                      (buttonClick)=\"cardOverflowMenu.toggle()\"\r\n                    ><i class=\"ri-more-2-fill\" aria-hidden=\"true\"></i></gom-lib-button>\r\n                  </div>\r\n                }\r\n              </div>\r\n\r\n              <div [ngClass]=\"hasMobileCardBody(row, rowIndex) ? 'gom-card__body' : 'gom-card__body--hidden'\">\r\n                  @if (getMobileCardVisibleFields(row).length > 0) {\r\n                    <div class=\"gom-card__field-grid\">\r\n                      @for (field of getMobileCardVisibleFields(row); track field.key) {\r\n                        @if (!isMobileCardFieldHidden(row, field)) {\r\n                          <div class=\"gom-card__field\" [class.gom-card__field--full]=\"getMobileCardFieldWidth(field) === 'full'\">\r\n                            <span class=\"gom-card__label\">{{ getMobileCardFieldLabel(row, field) }}</span>\r\n                            <span class=\"gom-card__value\">{{ getMobileCardFieldValue(row, field) }}</span>\r\n                          </div>\r\n                        }\r\n                      }\r\n                    </div>\r\n                  }\r\n\r\n                  @if (shouldShowMobileCardDetailsToggle(row)) {\r\n                    <button\r\n                      type=\"button\"\r\n                      class=\"gom-card__details-toggle\"\r\n                      (click)=\"toggleMobileCardDetails($event, row, rowIndex)\"\r\n                    >\r\n                      {{ getMobileCardDetailsToggleLabel(row, rowIndex) }}\r\n                    </button>\r\n                  }\r\n\r\n                  @if (isMobileCardExpanded(row, rowIndex) && getMobileCardExpandableFields(row).length > 0) {\r\n                    <div class=\"gom-card__field-grid gom-card__field-grid--expanded\">\r\n                      @for (field of getMobileCardExpandableFields(row); track field.key) {\r\n                        @if (!isMobileCardFieldHidden(row, field)) {\r\n                          <div class=\"gom-card__field\" [class.gom-card__field--full]=\"getMobileCardFieldWidth(field) === 'full'\">\r\n                            <span class=\"gom-card__label\">{{ getMobileCardFieldLabel(row, field) }}</span>\r\n                            <span class=\"gom-card__value\">{{ getMobileCardFieldValue(row, field) }}</span>\r\n                          </div>\r\n                        }\r\n                      }\r\n                    </div>\r\n                  }\r\n                </div>\r\n\r\n              @if (getMobileCardPrimaryActions(row).length > 0) {\r\n                <div class=\"gom-card__footer\" [class.gom-card__footer--icon-only]=\"!showMobileCardPrimaryActionLabels()\">\r\n                  @for (action of getMobileCardPrimaryActions(row); track action.actionKey) {\r\n                    <gom-lib-button\r\n                      class=\"gom-card__footer-action\"\r\n                      [class.gom-card__footer-action--icon-only]=\"!showMobileCardPrimaryActionLabels()\"\r\n                      variant=\"ghost\"\r\n                      [size]=\"showMobileCardPrimaryActionLabels() ? 'default' : 'compact-icon'\"\r\n                      [disabled]=\"isActionDisabled(action, row)\"\r\n                      [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                      [attr.title]=\"getActionTitle(action, row)\"\r\n                      (buttonClick)=\"onMobileCardOverflowActionClick($event, action.actionKey, row)\"\r\n                    >\r\n                      @if (getMobileCardActionIcon(action, row); as iconClass) {\r\n                        <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                      }\r\n                      @if (showMobileCardPrimaryActionLabels()) {\r\n                        <span>{{ getMobileCardActionLabel(action, row) }}</span>\r\n                      }\r\n                    </gom-lib-button>\r\n                  }\r\n                </div>\r\n              }\r\n            </div>\r\n          } @else {\r\n          @if (enableRowSelection) {\r\n            <label class=\"gom-card__selection\">\r\n              <input\r\n                type=\"checkbox\"\r\n                [checked]=\"isRowSelected(row, rowIndex)\"\r\n                (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n              />\r\n              <span>Select row {{ rowIndex + 1 }}</span>\r\n            </label>\r\n          }\r\n          @for (column of mobileCardColumns; track column.key) {\r\n            <div class=\"gom-card__row\">\r\n              <h5 class=\"gom-card__label\">{{ column.header }}</h5>\r\n              <p [class]=\"'gom-card__value text-' + getTextMode(column)\">{{ getCellValue(row, column) }}</p>\r\n            </div>\r\n          }\r\n\r\n          @if (getMobileCardActions(row).length > 0) {\r\n            <div class=\"gom-card__footer gom-card__footer--icon-only\" (click)=\"$event.stopPropagation()\">\r\n              @for (action of getMobileCardActions(row); track action.actionKey) {\r\n                @if (getSubActions(action).length > 0) {\r\n                  <div class=\"gom-table-action-menu\" [class.gom-table-action-menu--open]=\"isSubmenuOpen(action, row, $index)\">\r\n                    <gom-lib-button\r\n                      class=\"gom-card__footer-action gom-card__footer-action--icon-only\"\r\n                      variant=\"ghost\"\r\n                      size=\"compact-icon\"\r\n                      [disabled]=\"isActionDisabled(action, row)\"\r\n                      [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                      [attr.title]=\"getActionTitle(action, row)\"\r\n                      (buttonClick)=\"toggleSubmenu($event, action, row, $index)\"\r\n                    >\r\n                      @if (getActionIcon(action, row); as iconClass) {\r\n                        <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                      } @else {\r\n                        <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                      }\r\n                    </gom-lib-button>\r\n\r\n                    @if (isSubmenuOpen(action, row, $index)) {\r\n                      <div class=\"gom-table-submenu\" [ngStyle]=\"submenuPosition\" (click)=\"$event.stopPropagation()\">\r\n                        @for (subAction of getSubActions(action); track subAction.actionKey) {\r\n                          <gom-lib-button\r\n                            class=\"gom-table-submenu__item\"\r\n                            [variant]=\"subAction.variant || 'secondary'\"\r\n                            [disabled]=\"isActionDisabled(subAction, row)\"\r\n                            [attr.title]=\"getActionTitle(subAction, row)\"\r\n                            (buttonClick)=\"onSubmenuActionClick($event, subAction.actionKey, row)\"\r\n                          >\r\n                            {{ getActionLabel(subAction, row) }}\r\n                          </gom-lib-button>\r\n                        }\r\n                      </div>\r\n                    }\r\n                  </div>\r\n                } @else {\r\n                <gom-lib-button\r\n                  class=\"gom-card__footer-action gom-card__footer-action--icon-only\"\r\n                  variant=\"ghost\"\r\n                  size=\"compact-icon\"\r\n                  [disabled]=\"isActionDisabled(action, row)\"\r\n                  [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                  [attr.title]=\"getActionTitle(action, row)\"\r\n                  (buttonClick)=\"onMobileCardActionClick($event, action.actionKey, row)\"\r\n                >\r\n                  @if (getActionIcon(action, row); as iconClass) {\r\n                    <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                  } @else {\r\n                    <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                  }\r\n                </gom-lib-button>\r\n                }\r\n              }\r\n            </div>\r\n          }\r\n          }\r\n        </gom-lib-card>\r\n      }\r\n    }\r\n  </section>\r\n\r\n  @if (showPagination) {\r\n    <footer class=\"gom-table-mobile-pagination\">\r\n      @if (mobilePaginationMode === 'load-more') {\r\n        @if (canGoNext || loading) {\r\n          @if (mobileAutoLoadMore) {\r\n            <span #mobileLoadMoreSentinel class=\"gom-table-mobile-load-more-sentinel\" aria-hidden=\"true\"></span>\r\n          }\r\n          <gom-lib-button class=\"gom-table-mobile-load-more\" variant=\"secondary\" [disabled]=\"!canGoNext || loading\" (buttonClick)=\"requestLoadMore()\">\r\n            Load More {{ selectionItemLabel }}s\r\n          </gom-lib-button>\r\n        }\r\n      } @else {\r\n        <nav class=\"gom-table-pagination\" aria-label=\"Mobile table pagination\">\r\n          <gom-lib-button variant=\"secondary\" size=\"icon\" [disabled]=\"!canGoPrevious\" ariaLabel=\"Previous page\" (buttonClick)=\"previousPage()\"><i class=\"ri-arrow-left-s-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n          <div class=\"gom-table-pagination__pages\">\r\n            @for (item of paginationItems; track item) {\r\n              @if (typeof item === 'number') {\r\n                <gom-lib-button [variant]=\"item === pageIndex + 1 ? 'primary' : 'secondary'\" [ariaCurrent]=\"item === pageIndex + 1 ? 'page' : null\" [ariaLabel]=\"'Page ' + item\" (buttonClick)=\"goToPage(item)\">{{ item }}</gom-lib-button>\r\n              } @else { <span class=\"gom-table-pagination__ellipsis\">&hellip;</span> }\r\n            }\r\n          </div>\r\n          <gom-lib-button variant=\"secondary\" size=\"icon\" [disabled]=\"!canGoNext\" ariaLabel=\"Next page\" (buttonClick)=\"nextPage()\"><i class=\"ri-arrow-right-s-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n        </nav>\r\n      }\r\n    </footer>\r\n  }\r\n}\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"mobileTableOptionsOpen\"\r\n  [title]=\"mobileViewMode === 'cards' ? 'List Options' : 'Table Options'\"\r\n  mobilePresentation=\"sheet\"\r\n  (closed)=\"closeMobileTableOptions()\"\r\n>\r\n  <div class=\"gom-table-mobile-sheet-list\">\r\n    @if (showExport) {\r\n      <button type=\"button\" (click)=\"exportClick.emit(); closeMobileTableOptions()\"><i class=\"ri-download-2-line\"></i><span>Export</span></button>\r\n    }\r\n    @if (mobileViewMode === 'cards') {\r\n      @for (column of mobileSortColumns; track column.key) {\r\n        <button type=\"button\" (click)=\"setMobileSort(column)\"><i class=\"ri-sort-desc\"></i><span>Sort by {{ column.header }}</span>@if (sortState.key === column.key) { <small>{{ mobileSortLabel }}</small> }</button>\r\n      }\r\n    } @else {\r\n      @if (enableColumnSearch) {\r\n        <button type=\"button\" (click)=\"toggleMobileColumnSearch()\">\r\n          <i [class]=\"filtersVisible ? 'ri-search-eye-line' : 'ri-search-line'\" aria-hidden=\"true\"></i>\r\n          <span>{{ filtersVisible ? 'Hide column search' : 'Show column search' }}</span>\r\n        </button>\r\n      }\r\n      @if (enableColumnVisibility) {\r\n        <button type=\"button\" (click)=\"openMobileColumnPanel()\">\r\n          <i class=\"ri-layout-column-line\" aria-hidden=\"true\"></i>\r\n          <span>Manage columns</span>\r\n        </button>\r\n      }\r\n    }\r\n    @if (activeFilterCount > 0) {\r\n      <button type=\"button\" class=\"gom-table-mobile-sheet-list__danger\" (click)=\"clearAllFilters(); closeMobileTableOptions()\"><i class=\"ri-delete-bin-line\"></i><span>Clear All Filters</span></button>\r\n    }\r\n  </div>\r\n</gom-lib-modal>\r\n\r\n@if (isMobileViewport) {\r\n  <gom-lib-modal\r\n    [(show)]=\"columnPanelOpen\"\r\n    title=\"Manage Columns\"\r\n    mobilePresentation=\"sheet\"\r\n    (closed)=\"closeColumnPanel()\"\r\n  >\r\n    <div class=\"gom-table-mobile-columns\">\r\n      <p>Select the columns to display in table view.</p>\r\n      <div class=\"gom-table-mobile-columns__list\">\r\n        @for (column of columns; track column.key) {\r\n          <label class=\"gom-table-mobile-columns__option\">\r\n            <input\r\n              type=\"checkbox\"\r\n              [checked]=\"visibleColumnKeys.has(column.key)\"\r\n              [disabled]=\"column.hideable === false || (visibleColumnKeys.size === 1 && visibleColumnKeys.has(column.key))\"\r\n              (change)=\"toggleColumn(column.key)\"\r\n            />\r\n            <span>{{ column.header }}</span>\r\n          </label>\r\n        }\r\n      </div>\r\n    </div>\r\n  </gom-lib-modal>\r\n}\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"mobileRowActionsOpen\"\r\n  [title]=\"mobileRowActionTarget && mobileCardConfig ? getMobileCardTitle(mobileRowActionTarget, 0) : 'Row Actions'\"\r\n  mobilePresentation=\"sheet\"\r\n  (closed)=\"closeMobileRowActions()\"\r\n>\r\n  @if (mobileRowActionTarget) {\r\n    <div class=\"gom-table-mobile-sheet-list\">\r\n      @for (action of getMobileRowSheetActions(mobileRowActionTarget); track action.actionKey) {\r\n        <button\r\n          type=\"button\"\r\n          [class.gom-table-mobile-sheet-list__danger]=\"action.variant === 'danger'\"\r\n          [disabled]=\"isActionDisabled(action, mobileRowActionTarget)\"\r\n          (click)=\"triggerMobileRowAction(action.actionKey)\"\r\n        >\r\n          <i [class]=\"getActionIcon(action, mobileRowActionTarget) || 'ri-arrow-right-line'\" aria-hidden=\"true\"></i>\r\n          <span>{{ getActionLabel(action, mobileRowActionTarget) }}</span>\r\n        </button>\r\n      }\r\n    </div>\r\n  }\r\n</gom-lib-modal>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:block}.gom-table-shell{display:grid;gap:0;width:100%;padding:0;background:#fff;border:.125rem solid #e9e9e9;border-radius:.75rem;box-shadow:0 1px 3px #0000000f,0 1px 2px #0000000a}.gom-table-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem;padding:1.5rem 1.5rem 1rem;border-bottom:.0625rem solid #e9e9e9}.gom-table-toolbar__search{position:relative;flex:1;min-width:0}.gom-table-toolbar__actions{position:relative;display:inline-flex;align-items:flex-end;gap:.5rem;margin-left:auto}.gom-table-options-button__label{margin-left:.25rem}.gom-table-mobile-toggle{display:none;align-items:center}.gom-table-search{display:block;min-width:14rem;max-width:28rem}.gom-table-quick-filter{display:flex;align-items:flex-end;min-width:9rem;max-width:14rem}.gom-table-quick-filter>*{width:100%}.gom-table-filter-button{display:inline-flex;white-space:nowrap}.gom-table-filter-button i{margin-right:.25rem}.gom-table-options{position:relative;display:inline-flex}.gom-table-options__menu{position:absolute;top:calc(100% + .5rem);right:0;z-index:20;display:grid;gap:.25rem;min-width:13rem;padding:.5rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024}.gom-table-options__item{justify-content:flex-start;text-align:left}.gom-table-options__item i{margin-right:.5rem}.gom-table-icon-button{display:inline-flex;align-items:center;justify-content:center}.gom-table-icon-button i{font-size:1.25rem;color:currentColor}.gom-table-filter-navigation{display:grid;min-width:0;border-bottom:.0625rem solid #e9e9e9;background:#fff}.gom-table-filter-navigation__row{display:flex;align-items:center;gap:.75rem;min-width:0;padding:.5rem 1.5rem}.gom-table-filter-navigation__row+.gom-table-filter-navigation__row{border-top:.0625rem solid #e9e9e9}.gom-table-filter-navigation__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;flex:0 0 auto;min-width:5rem;color:#58595b}.gom-table-filter-navigation__options{display:flex;flex:1 1 auto;align-items:center;gap:.5rem;min-width:0}.gom-table-filter-navigation__option{flex:0 0 auto;white-space:nowrap}.gom-table-filter-navigation__option-label{display:inline-block}.gom-table-filter-navigation__count{display:inline-flex;align-items:center;justify-content:center;min-width:1.375rem;min-height:1.375rem;margin-inline-start:.5rem;padding:0 .25rem;border:.125rem solid #d8d8d8;border-radius:999px;background:#fff;color:#58595b;font-size:.75rem;font-weight:600;line-height:1}.gom-table-filter-navigation__option--selected .gom-table-filter-navigation__count{border-color:transparent;background:#fff;color:#0a5d8b}.gom-table-filter-navigation__more{position:relative;flex:0 0 auto;margin-left:auto}.gom-table-filter-navigation__menu{position:absolute;top:calc(100% + .25rem);right:0;z-index:30;display:grid;gap:.25rem;min-width:12rem;max-height:18rem;padding:.5rem;overflow-y:auto;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024}.gom-table-filter-navigation__menu-item{display:block;width:100%}.gom-table-bulk-actions{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 1.5rem;border-bottom:.0625rem solid #e9e9e9;background:#e6f7ff}.gom-table-bulk-actions__summary,.gom-table-bulk-actions__controls{display:flex;align-items:center;gap:.5rem}.gom-table-bulk-actions__summary{color:#0a5d8b}.gom-table-bulk-actions__summary i{font-size:1.125rem}.gom-table-bulk-actions__controls{flex-wrap:wrap;justify-content:flex-end}.gom-table-bulk-actions__controls i{margin-right:.25rem}.gom-table-bulk-actions__clear i{margin-right:0}.gom-table-inline-edit-banner{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 1.5rem;border-bottom:.0625rem solid #f5c242;background:#fffbeb}.gom-table-inline-edit-banner__summary,.gom-table-inline-edit-banner__actions{display:flex;align-items:center;gap:.5rem}.gom-table-inline-edit-banner__summary{color:#212121}.gom-table-inline-edit-banner__summary strong{font-weight:700}.gom-table-inline-edit-banner__summary span:last-child{color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.gom-table-inline-edit-banner__count{display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:50%;background:#f59e0b;color:#1f2937;font-size:.6875rem;font-weight:700}.gom-table-inline-edit-banner__actions{flex-wrap:wrap;justify-content:flex-end}@media(max-width:48rem){.gom-table-bulk-actions{align-items:stretch;flex-direction:column}.gom-table-bulk-actions__controls{justify-content:flex-start}.gom-table-inline-edit-banner,.gom-table-inline-edit-banner__summary{align-items:flex-start;flex-direction:column}.gom-table-inline-edit-banner__actions{width:100%;justify-content:flex-start}}.gom-table-panel{position:absolute;top:calc(100% + .5rem);right:0;width:min(18rem,85vw);border:.125rem solid #d8d8d8;border-radius:.75rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024;z-index:10;overflow:hidden}.gom-table-panel__header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem;border-bottom:.125rem solid #d8d8d8}.gom-table-panel__header h3{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-table-panel__close{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;border:0;background:transparent;color:#0a5d8b;padding:0}.gom-table-panel__body{display:grid;gap:.5rem;padding:1rem;max-height:18rem;overflow:auto}.gom-table-wrap{overflow:auto;max-height:var(--gom-table-body-max-height, none);background:#fff;scrollbar-width:thin;scrollbar-color:#767676 #f6f6f6}.gom-table-wrap::-webkit-scrollbar{height:.625rem;width:.625rem}.gom-table-wrap::-webkit-scrollbar-track{background:#f6f6f6;border-radius:999px}.gom-table-wrap::-webkit-scrollbar-thumb{background:#767676;border-radius:999px;border:2px solid #f6f6f6}.gom-table-wrap::-webkit-scrollbar-thumb:hover{background:#0a5d8b}.gom-table-wrap::-webkit-scrollbar-button{display:none;width:0;height:0}.gom-card-list,.gom-table-applied-filters,.gom-table-mobile-result-bar,.gom-table-mobile-pagination{display:none}.gom-card-item{transition:box-shadow .14s ease,transform .14s ease}.gom-card-item--clickable{cursor:pointer}.gom-card-item--clickable:hover,.gom-card-item--clickable:focus-within{box-shadow:0 .25rem .75rem #0f172a1a;transform:translateY(-1px)}.gom-card__selection{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:.0625rem solid #d8d8d8;color:#0a5d8b}.gom-card__row{display:grid;gap:.25rem;padding-bottom:.25rem}.gom-card__row:not(:last-child){margin-bottom:.25rem}.gom-card__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;margin:0;color:#0a5d8b}.gom-card__value{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;margin:0;color:#212121}.gom-card__actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.5rem;padding-top:.5rem;border-top:.0625rem solid #d8d8d8}.gom-card__state{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;margin:0;color:#58595b;text-align:center;padding:1rem 0}.gom-card-item--skeleton{pointer-events:none}.gom-card-item--skeleton .gom-card__skeleton-line{display:block;margin-bottom:.5rem}.gom-card-item--skeleton .gom-card__skeleton-line--title{width:44%;height:.9rem}.gom-card-item--skeleton .gom-card__skeleton-line--wide{width:88%;margin-bottom:0}.gom-table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;padding:1rem;border-bottom:.0625rem solid #e9e9e9}th{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;position:sticky;top:0;z-index:1;background:#f6f6f6;color:#0a5d8b;-webkit-user-select:none;user-select:none;text-transform:uppercase;letter-spacing:.03em;font-size:.7rem;font-weight:600}.gom-table-filter-row th{padding-top:.25rem;padding-bottom:.5rem;background:#94a3b814}.gom-table-column-filter{width:100%;min-width:0}.gom-table-filter-spacer{display:block;min-height:2rem}th.sortable{cursor:pointer}th.sortable:hover{background:#94a3b81f}.sort-indicator{margin-left:.25rem;display:inline-flex;align-items:center;justify-content:center;min-width:1rem;color:#074161}.sort-indicator i{font-size:1rem}.align-left{text-align:left}.align-center{text-align:center}.align-right{text-align:right}.text-truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.text-wrap{white-space:normal;overflow-wrap:anywhere}.text-expand{white-space:pre-wrap}.gom-table-selection-col{width:2.5rem;min-width:2.5rem;text-align:center}.gom-table-selection-col input[type=checkbox]{margin:0;cursor:pointer}.state-cell{text-align:center;color:#9e9e9e;padding:1.5rem}.gom-table-skeleton-row:hover{background:transparent}.gom-table-skeleton-cell{vertical-align:middle}.gom-table-skeleton-line,.gom-table-skeleton-box,.gom-card__skeleton-line{display:inline-block;width:100%;height:.75rem;border-radius:999px;background:linear-gradient(90deg,#94a3b829,#94a3b852 45%,#94a3b829);background-size:200% 100%;animation:gom-skeleton-shimmer 1.2s ease-in-out infinite}.gom-table-skeleton-box{width:1rem;height:1rem;border-radius:.25rem}.gom-table-skeleton-cell:nth-child(3n) .gom-table-skeleton-line{width:72%}.gom-table-skeleton-cell:nth-child(4n) .gom-table-skeleton-line{width:56%}.gom-table-skeleton-cell:nth-child(5n) .gom-table-skeleton-line{width:84%}tbody tr{transition:background-color .12s ease}tbody tr:hover{background:#2563eb0a}@keyframes gom-skeleton-shimmer{0%{background-position:100% 0}to{background-position:-100% 0}}.gom-table-actions{display:inline-flex;flex-wrap:nowrap;gap:.5rem}.gom-table-action-menu,.gom-table-action-overflow{position:relative;display:inline-flex}.gom-table-submenu{position:fixed;z-index:9999;min-width:12rem;display:flex;flex-direction:column;gap:.25rem;padding:.5rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1rem #00000029}.gom-table-submenu__item{justify-content:flex-start;text-align:left}.gom-table-actions__button{flex:0 0 auto}.gom-table-cell--actions{white-space:nowrap;overflow:visible}.gom-table-cell-action{appearance:none;border:0;background:transparent;padding:0;margin:0;display:inline-flex;align-items:center;gap:.35rem;color:inherit;font:inherit;cursor:pointer;text-decoration:none}.gom-table-cell-action__icon{font-size:.95rem;color:#074161}.gom-table-cell-action--chip{text-decoration:none}.gom-table-cell-action:hover{color:#074161}.gom-table-cell-action--chip:hover{color:inherit}.gom-table-cell--editable{overflow:visible}.gom-table-cell--editing{padding-top:.5rem;padding-bottom:.5rem}.gom-table-cell-editor{display:block;width:100%;min-width:0;text-align:left}.gom-table-cell-edit-trigger{width:100%;appearance:none;border:.0625rem solid transparent;border-radius:.25rem;background:transparent;padding:.25rem;color:inherit;font:inherit;text-align:inherit;cursor:text}.gom-table-cell-edit-trigger:hover,.gom-table-cell-edit-trigger:focus-visible{border-color:#d8d8d8;outline:none;background:#f6f6f6}.gom-table-header--actions,.gom-table-cell--actions{min-width:11.5rem}.gom-table-footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem 1.5rem}.gom-table-footer__summary{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#58595b}.gom-table-footer__summary strong{color:#212121;font-weight:600}.gom-table-page-size-select{min-width:6.25rem}.gom-table-pagination,.gom-table-pagination__pages{display:inline-flex;align-items:center;gap:.25rem}.gom-table-pagination__ellipsis{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;min-width:1.5rem;color:#58595b}.gom-table-pager-button,.gom-table-page-button{display:inline-flex;align-items:center;justify-content:center;min-width:2rem;min-height:2rem;border-radius:.5rem;transition:all .12s ease}.gom-table-pager-button i,.gom-table-page-button i{font-size:1.25rem;color:currentColor}.gom-table-pager-button:not([disabled]):hover,.gom-table-page-button:not([disabled]):hover{transform:translateY(-1px)}.gom-table-page-button{min-width:2rem}@media(max-width:48rem){.gom-table-footer{align-items:flex-start;flex-direction:column}.gom-table-pagination{width:100%}.gom-table-page-size-select{margin-left:auto}}@media(max-width:32rem){.gom-table-pagination__pages{display:none}}.checkbox-row{display:inline-flex;align-items:center;gap:.5rem}.gom-table-advanced-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.gom-table-advanced-filters__empty{grid-column:1/-1;margin:0;color:#58595b}.gom-table-date-range{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;min-width:0;margin:0;padding:1rem;border:.125rem solid #d8d8d8;border-radius:.5rem}.gom-table-date-range legend{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;padding:0 .25rem;color:#0a5d8b}.gom-table-filter-actions{display:flex;align-items:center;justify-content:space-between;width:100%;gap:.75rem}.gom-table-filter-actions__end{display:flex;align-items:center;gap:.5rem}@media(max-width:48rem){:host(.gom-table-mobile-card){--gom-mobile-table-blue: #074161;display:block}:host(.gom-table-mobile-card) .gom-table-shell{gap:0}.gom-table-toolbar{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:.5rem;padding:1rem 1rem .5rem}.gom-table-toolbar__search{grid-column:1/-1;min-width:0}.gom-table-toolbar__actions{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;flex-wrap:nowrap;gap:.25rem;margin-left:0;width:100%}.gom-table-toolbar__actions>.gom-table-filter-button{flex:0 0 auto}.gom-table-toolbar__actions>.gom-table-options{min-width:0;width:100%}.gom-table-toolbar__actions .gom-table-mobile-toggle{margin-left:0;justify-self:end}.gom-table-toolbar__actions .gom-table-options{margin-left:0}.gom-table-quick-filter,.gom-table-clear-filters{display:none}.gom-table-mobile-toggle{display:inline-flex;align-items:center;gap:.125rem;margin:0;padding:.125rem .2rem;border:.125rem solid #e9e9e9;border-radius:.5rem;background:#f6f6f6}.gom-table-mobile-toggle legend{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.gom-table-mobile-toggle>gom-lib-button ::ng-deep .gom-button{min-width:1.9rem;min-height:1.9rem;border:0;padding:.22rem;border-radius:.5rem;background:transparent;color:#58595b}.gom-table-mobile-toggle>gom-lib-button ::ng-deep .gom-button:not(.gom-button--ghost):not(.gom-button--secondary):not(.gom-button--danger){background:#074161;color:#fff}.gom-table-filter-button .gom-table-filter-button__label{display:inline;font-size:.88rem;font-weight:600}.gom-table-filter-button i{margin-right:.25rem;font-size:.95rem}.gom-table-filter-button ::ng-deep .gom-button{min-height:2.05rem;border:.125rem solid #e9e9e9;border-radius:.55rem;background:#fff;color:#212121;padding-inline:.68rem;box-shadow:none}.gom-table-filter-button ::ng-deep .gom-button:not(.gom-button--secondary):not(.gom-button--danger):not(.gom-button--ghost){border-color:#0a5d8b;background:#e6f7ff;color:#074161}.gom-table-options-button{width:100%}.gom-table-options-button .gom-table-options-button__label{display:inline-block;margin-left:.25rem;font-size:.88rem;font-weight:600;min-width:0;max-width:8.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gom-table-options-button i{margin-right:.25rem;font-size:.95rem}.gom-table-options-button ::ng-deep .gom-button{min-height:2.05rem;border:.125rem solid #e9e9e9;border-radius:.55rem;background:#fff;color:#212121;padding-inline:.68rem;box-shadow:none;width:100%;min-width:0;justify-content:flex-start}.gom-table-search{min-width:0;max-width:100%}.gom-table-search ::ng-deep .gom-input{border-color:#e9e9e9;border-radius:.6rem;min-height:2.2rem;box-shadow:none}.gom-table-applied-filters{display:grid;gap:.25rem;padding:.5rem 0;margin-left:1.2rem}.gom-table-applied-filters__chips{display:flex;align-items:center;gap:.25rem;overflow-x:auto;scrollbar-width:none}.gom-table-applied-filter,.gom-table-applied-filters__clear{flex:0 0 auto;border:1px solid var(--gom-mobile-table-blue);border-radius:.25rem;padding:.2rem .45rem;background:#eff6ff;color:var(--gom-mobile-table-blue);font:inherit;font-size:.72rem;font-weight:600}.gom-table-applied-filters__clear{border-color:transparent;background:transparent}.gom-table-applied-filters__summary{display:none}.gom-table-filter-navigation__row{display:block;padding:.5rem 0}.gom-table-filter-navigation__label{display:none}.gom-table-filter-navigation__options{gap:.25rem;overflow-x:auto;padding:0 .5rem;scrollbar-width:none}.gom-table-filter-navigation__options::-webkit-scrollbar{display:none}.gom-table-filter-navigation__row+.gom-table-filter-navigation__row{display:none}.gom-table-mobile-result-bar{display:flex;align-items:center;flex-wrap:wrap;gap:.25rem;padding:.45rem .5rem;border-bottom:.125rem solid #d8d8d8;background:#fff;color:#58595b;font-size:.82rem}.gom-table-mobile-result-bar strong{color:var(--gom-mobile-table-blue);font-weight:700}.gom-table-advanced-filters,.gom-table-date-range{grid-template-columns:1fr}.gom-table-filter-actions{align-items:stretch;flex-direction:column}.gom-table-filter-actions__end{justify-content:flex-end}:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-table-wrap,:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-table-footer{display:none}:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-card-list{display:grid;gap:.75rem;padding:1rem 0}.gom-card-item{border:.125rem solid #d8d8d8;border-radius:.75rem;padding:.75rem 1rem;box-shadow:0 .125rem .375rem #0f172a14}.gom-card-item--selected{border:2px solid var(--gom-mobile-table-blue)}.gom-card__config{display:grid;gap:.75rem}.gom-card__header{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:start;gap:.5rem;min-height:1.75rem}.gom-card__checkbox input{display:block;width:1rem;height:1rem;margin:0;accent-color:var(--gom-mobile-table-blue)}.gom-card__primary{overflow:hidden;color:var(--gom-mobile-table-blue);text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;font-weight:700}.gom-card__header time{color:#58595b;font-size:.75rem}.gom-card__menu-trigger{width:1.5rem;min-width:1.5rem;min-height:1.5rem}.gom-card__menu-trigger i{font-size:1.1rem}.gom-card__identity{display:flex;align-items:center;gap:.5rem;margin:.5rem 0;padding-left:.5rem}.gom-card__identity div{display:grid;min-width:0}.gom-card__identity strong{font-size:.8rem;line-height:1.25}.gom-card__identity small{color:#58595b;font-size:.7rem;line-height:1.25}.gom-card__identity--stacked{align-items:flex-start;margin:0;padding-left:0}.gom-card__subtitle{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem;margin-top:.15rem;color:#58595b;font-size:.7rem;line-height:1.2}.gom-card__subtitle-separator{color:#58595b}.gom-card__status-chip{align-self:start}.gom-card__overflow{position:relative;display:inline-flex;align-items:flex-start;justify-content:flex-end}.gom-card__body{display:grid;gap:.5rem}.gom-card__body--hidden{display:none}.gom-card__field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem .75rem;padding-top:.75rem;border-top:.0625rem solid #e9e9e9}.gom-card__field-grid--expanded{padding-top:0;border-top:0}.gom-card__field{display:grid;gap:.2rem;min-width:0}.gom-card__field--full{grid-column:1/-1}.gom-card__config .gom-card__label{color:#58595b;font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.gom-card__config .gom-card__value{overflow-wrap:anywhere;color:#212121;font-size:.82rem;font-weight:600}.gom-card__details-toggle{border:0;padding:.1rem 0;background:transparent;color:var(--gom-mobile-table-blue);font:inherit;font-size:.78rem;font-weight:700;line-height:1.3;text-align:center}.gom-card__footer{display:flex;flex-wrap:nowrap;align-items:center;justify-content:flex-end;gap:.25rem;padding-top:.6rem;border-top:.0625rem solid #e9e9e9;overflow-x:auto;scrollbar-width:none}.gom-card__footer::-webkit-scrollbar{display:none}.gom-card__footer-action{flex:0 0 auto;width:auto;justify-content:flex-start;min-width:0}.gom-card__footer-action i{margin-right:.3rem}.gom-card__footer-action span{white-space:nowrap}.gom-card__footer-action--icon-only{flex:0 0 2rem;width:2rem;min-width:2rem;max-width:2rem;display:inline-flex;justify-content:center}.gom-card__footer-action--icon-only ::ng-deep .gom-button{padding:0}.gom-card__footer-action--icon-only i{margin-right:0}.gom-card__footer--icon-only{gap:.125rem}.gom-card__avatar{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:50%;background:#eff6ff;color:var(--gom-mobile-table-blue);font-size:.68rem;font-weight:700}.gom-card__summary-row,.gom-card__metadata{display:flex;align-items:center;gap:.5rem}.gom-card__summary-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);column-gap:1rem;align-items:center;padding:.45rem 0 .55rem;font-size:.78rem}.gom-card__summary-row>span:first-child{justify-self:start}.gom-card__summary-row>strong{justify-self:center}.gom-card__source{justify-self:end;border-radius:.25rem;padding:.12rem .45rem;background:#f6f6f6;font-size:.66rem}.gom-card__metadata{min-height:2rem;padding-top:.5rem;border-top:.0625rem solid #d8d8d8;color:#58595b;font-size:.72rem}.gom-table-mobile-pagination{display:flex;justify-content:center;padding:1rem 0}.gom-table-mobile-pagination .gom-table-pagination{justify-content:center;width:100%}.gom-table-mobile-load-more{width:100%}.gom-table-mobile-load-more-sentinel{display:block;width:100%;height:1px}.gom-table-bulk-actions{display:contents}.gom-table-bulk-actions__summary{position:sticky;top:0;z-index:12;justify-content:space-between;padding:1rem;background:var(--gom-mobile-table-blue);color:#fff}.gom-table-bulk-actions__controls{position:fixed;right:0;bottom:0;left:0;z-index:900;flex-wrap:nowrap;padding:1rem;border-top:.125rem solid #d8d8d8;background:#fff;box-shadow:0 -.25rem .75rem #0f172a14}.gom-table-bulk-actions__controls>*{flex:1 1 auto}.gom-table-mobile-filter-group{margin:0;padding:0 0 1.5rem;border:0;border-bottom:.125rem solid #d8d8d8}.gom-table-mobile-filter-group legend{margin-bottom:1rem;color:#58595b;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.gom-table-mobile-filter-options{display:grid;gap:.75rem}.gom-table-mobile-filter-option{display:flex;align-items:center;gap:.5rem;min-height:1.9rem;color:#212121}.gom-table-mobile-filter-option input{width:1.15rem;height:1.15rem;accent-color:var(--gom-mobile-table-blue)}.gom-table-mobile-filter-option span{flex:1}.gom-table-mobile-filter-option small{color:#9e9e9e}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-options{display:flex;flex-wrap:wrap;gap:.5rem}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option{min-height:auto;border:.125rem solid #d8d8d8;border-radius:999px;padding:.45rem .8rem}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option input{position:absolute;opacity:0;pointer-events:none}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option span{flex:initial}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option--selected{border-color:var(--gom-mobile-table-blue);color:var(--gom-mobile-table-blue);font-weight:600}.gom-table-filter-actions__summary{display:block;text-align:center;color:#58595b;font-size:.78rem}.gom-table-filter-actions__end,.gom-table-filter-actions__apply{width:100%}.gom-table-filter-actions__end>gom-lib-button:first-child{display:none}.gom-table-mobile-sheet-list{display:grid;margin:0 -1rem}.gom-table-mobile-sheet-list button{display:grid;grid-template-columns:1.5rem minmax(0,1fr) auto auto;align-items:center;gap:.5rem;min-height:3rem;border:0;border-bottom:.0625rem solid #d8d8d8;padding:0 1rem;background:transparent;color:#212121;font:inherit;text-align:left}.gom-table-mobile-sheet-list button small{color:#9e9e9e}.gom-table-mobile-sheet-list button:disabled{opacity:.45}.gom-table-mobile-sheet-list__danger{color:#eb0a1e!important}.gom-table-mobile-columns{display:grid;gap:.5rem}.gom-table-mobile-columns>p{margin:0;color:#58595b;font-size:.78rem}.gom-table-mobile-columns__list{display:grid;max-height:60dvh;margin:0 -1rem;overflow-y:auto}.gom-table-mobile-columns__option{display:flex;align-items:center;gap:.5rem;min-height:3rem;padding:0 1rem;border-bottom:.0625rem solid #d8d8d8;color:#212121;cursor:pointer}.gom-table-mobile-columns__option input{width:1.1rem;height:1.1rem;margin:0;accent-color:var(--gom-mobile-table-blue)}.gom-table-mobile-columns__option:has(input:disabled){color:#767676;cursor:not-allowed}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-card-list{display:none}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-footer{display:none}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table{width:max-content;min-width:42rem;table-layout:auto}:host(.gom-table-mobile-card).gom-table-mobile-table-active th,:host(.gom-table-mobile-card).gom-table-mobile-table-active td{min-width:8rem;white-space:nowrap}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-filter-row th{position:sticky;top:2.25rem;z-index:2;min-height:2.75rem;background:#fff}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-column-filter{display:block;min-width:7rem}:host(.gom-table-mobile-card).gom-table-mobile-table-active th:last-child,:host(.gom-table-mobile-card).gom-table-mobile-table-active td:last-child{min-width:4.5rem}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i1.NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }, { kind: "ngmodule", type: FormsModule }, { kind: "directive", type: i1$1.NgControlStatus, selector: "[formControlName],[ngModel],[formControl]" }, { kind: "directive", type: i1$1.NgModel, selector: "[ngModel]:not([formControlName]):not([formControl])", inputs: ["name", "disabled", "ngModel", "ngModelOptions"], outputs: ["ngModelChange"], exportAs: ["ngModel"] }, { kind: "component", type: GomInputComponent, selector: "gom-lib-input", inputs: ["label", "required", "type", "min", "max", "step", "placeholder", "inputmode", "hint", "error", "leadingIcon", "clearable", "id", "ariaLabel", "disabled"], outputs: ["valueChange"] }, { kind: "component", type: GomButtonComponent, selector: "gom-lib-button", inputs: ["type", "variant", "size", "disabled", "ariaLabel", "ariaExpanded", "ariaHaspopup", "ariaCurrent", "buttonTitle", "ariaRole"], outputs: ["buttonClick"] }, { kind: "component", type: GomSelectComponent, selector: "gom-lib-select", inputs: ["label", "required", "placeholder", "options", "isDisabled", "hint", "error", "id", "multiple", "selectedValues", "searchable", "searchPlaceholder", "selectAllLabel", "closeMenuTrigger", "ariaLabel"], outputs: ["valueChange", "selectedValuesChange"] }, { kind: "component", type: GomCardComponent, selector: "gom-lib-card, [gomLibCard]", inputs: ["contentGutter", "contentGap"] }, { kind: "component", type: GomChipComponent, selector: "gom-lib-chip", inputs: ["tone", "size", "fullWidth", "interactive", "selected", "disabled", "ariaLabel", "ariaRole"], outputs: ["chipClick"] }, { kind: "component", type: GomModalComponent, selector: "gom-lib-modal", inputs: ["show", "title", "closeOnBackdropClick", "closeOnEscape", "showCloseButton", "size", "mobilePresentation", "headerActionLabel"], outputs: ["showChange", "closed", "headerAction"] }, { kind: "component", type: MenuComponent, selector: "core-lib-menu", inputs: ["menuList", "menuType", "outsideClickBoundary", "showMenuListArrow", "showMobileBackArrow", "mobileBackArrowIcon", "backButtonText", "showSideNavOpen"], outputs: ["showSideNavOpenChange"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTableComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-table', standalone: true, imports: [CommonModule, FormsModule, GomInputComponent, GomButtonComponent, GomSelectComponent, GomCardComponent, GomChipComponent, GomModalComponent, MenuComponent], changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        '[class.gom-table-mobile-card]': 'mobileCardView',
                        '[class.gom-table-mobile-cards-active]': 'isMobileCardsActive',
                        '[class.gom-table-mobile-table-active]': 'isMobileTableActive',
                    }, template: "<section class=\"gom-table-shell\">\r\n  <header class=\"gom-table-toolbar\">\r\n    @if (showSearch) {\r\n    <div class=\"gom-table-toolbar__search\" role=\"search\">\r\n      <gom-lib-input\r\n        class=\"gom-table-search\"\r\n        type=\"search\"\r\n        leadingIcon=\"ri-search-line\"\r\n        [clearable]=\"true\"\r\n        ariaLabel=\"Search table\"\r\n        [placeholder]=\"searchPlaceholder\"\r\n        [ngModel]=\"searchTerm\"\r\n        (ngModelChange)=\"setSearchTerm($event)\"\r\n      ></gom-lib-input>\r\n    </div>\r\n    }\r\n\r\n    <div class=\"gom-table-toolbar__actions\">\r\n      @for (filter of toolbarFilterDefinitions; track filter.key) {\r\n        <div class=\"gom-table-quick-filter\">\r\n          @if (filter.type === 'select') {\r\n            <gom-lib-select\r\n              [label]=\"filter.label\"\r\n              [placeholder]=\"filter.placeholder || ('All ' + filter.label)\"\r\n              [options]=\"getFilterOptions(filter)\"\r\n              [searchable]=\"filter.searchable || false\"\r\n              [ngModel]=\"getFilterString(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-select>\r\n          } @else if (filter.type === 'multi-select') {\r\n            <gom-lib-select\r\n              [label]=\"filter.label\"\r\n              [placeholder]=\"filter.placeholder || ('All ' + filter.label)\"\r\n              [options]=\"getFilterOptions(filter)\"\r\n              [multiple]=\"true\"\r\n              [searchable]=\"filter.searchable ?? true\"\r\n              [ngModel]=\"getFilterArray(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-select>\r\n          } @else if (filter.type !== 'date-range') {\r\n            <gom-lib-input\r\n              [label]=\"filter.label\"\r\n              [type]=\"filter.type === 'date' ? 'date' : 'text'\"\r\n              [placeholder]=\"filter.placeholder || filter.label\"\r\n              [ngModel]=\"getFilterString(advancedFilters, filter.key)\"\r\n              (ngModelChange)=\"setQuickFilterValue(filter.key, $event)\"\r\n            ></gom-lib-input>\r\n          }\r\n        </div>\r\n      }\r\n\r\n      @if (showFilterButton) {\r\n        <gom-lib-button\r\n          class=\"gom-table-filter-button\"\r\n          [variant]=\"advancedFilterModalOpen || activeFilterCount > 0 ? 'primary' : 'secondary'\"\r\n          size=\"default\"\r\n          [disabled]=\"panelFilterDefinitions.length === 0\"\r\n          (buttonClick)=\"openAdvancedFilters()\"\r\n          [ariaExpanded]=\"advancedFilterModalOpen\"\r\n          ariaHaspopup=\"dialog\"\r\n          [ariaLabel]=\"activeFilterCount ? 'Filters, ' + activeFilterCount + ' active' : 'Filters'\"\r\n          [buttonTitle]=\"panelFilterDefinitions.length ? 'Open filters' : 'No panel filters configured'\"\r\n        >\r\n          <i class=\"ri-equalizer-3-line\" aria-hidden=\"true\"></i>\r\n          <span class=\"gom-table-filter-button__label\">Filter@if (activeFilterCount) { ({{ activeFilterCount }}) }</span>\r\n        </gom-lib-button>\r\n      }\r\n\r\n      @if (showClearFilterButton && activeFilterCount > 0) {\r\n        <gom-lib-button\r\n          class=\"gom-table-icon-button gom-table-clear-filters\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"clearAllFilters()\"\r\n          [ariaLabel]=\"'Clear all ' + activeFilterCount + ' active filters'\"\r\n          buttonTitle=\"Clear all filters\"\r\n        ><i class=\"ri-filter-off-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n      }\r\n\r\n      @if (showToolbarOptions) {\r\n        <div class=\"gom-table-options\" #tableOptionsBoundary>\r\n          <core-lib-menu\r\n            #toolbarOptionsMenu\r\n            [menuType]=\"'submenu'\"\r\n            [outsideClickBoundary]=\"tableOptionsBoundary\"\r\n            [menuList]=\"toolbarOptionsMenuList\"\r\n            [showMenuListArrow]=\"false\"\r\n            [showMobileBackArrow]=\"false\"\r\n            [backButtonText]=\"'Table options'\"\r\n          ></core-lib-menu>\r\n\r\n          <gom-lib-button\r\n            class=\"gom-table-icon-button gom-table-options-button\"\r\n            variant=\"secondary\"\r\n            [size]=\"isMobileViewport ? 'default' : 'icon'\"\r\n            (buttonClick)=\"isMobileViewport ? openMobileTableOptions() : toolbarOptionsMenu.toggle()\"\r\n            [ariaLabel]=\"isMobileViewport ? 'Sort and table options' : (isMobileViewport && mobileViewMode === 'cards' ? 'List options' : 'Table options')\"\r\n            [buttonTitle]=\"isMobileViewport ? 'Sort and table options' : (isMobileViewport && mobileViewMode === 'cards' ? 'List options' : 'Table options')\"\r\n            ariaHaspopup=\"menu\"\r\n            [ariaExpanded]=\"isMobileViewport ? mobileTableOptionsOpen : null\"\r\n          >\r\n            <i [class]=\"isMobileViewport ? 'ri-equalizer-line' : 'ri-more-2-fill'\" aria-hidden=\"true\"></i>\r\n            @if (isMobileViewport) {\r\n              <span class=\"gom-table-options-button__label\">{{ mobileSortButtonLabel }}</span>\r\n            }\r\n          </gom-lib-button>\r\n        </div>\r\n      }\r\n\r\n      @if (showMobileViewToggle) {\r\n        <fieldset class=\"gom-table-mobile-toggle\">\r\n          <legend>Mobile results view</legend>\r\n          <gom-lib-button\r\n            [variant]=\"mobileViewMode === 'cards' ? 'primary' : 'ghost'\"\r\n            size=\"compact-icon\"\r\n            ariaLabel=\"Show list view\"\r\n            buttonTitle=\"List view\"\r\n            (buttonClick)=\"setMobileViewMode('cards')\"\r\n          ><i class=\"ri-list-check-2\" aria-hidden=\"true\"></i></gom-lib-button>\r\n          <gom-lib-button\r\n            [variant]=\"mobileViewMode === 'table' ? 'primary' : 'ghost'\"\r\n            size=\"compact-icon\"\r\n            ariaLabel=\"Show table view\"\r\n            buttonTitle=\"Table view\"\r\n            (buttonClick)=\"setMobileViewMode('table')\"\r\n          ><i class=\"ri-table-2\" aria-hidden=\"true\"></i></gom-lib-button>\r\n        </fieldset>\r\n      }\r\n\r\n      @if (columnPanelOpen && !isMobileViewport) {\r\n        <section class=\"gom-table-panel\">\r\n          <header class=\"gom-table-panel__header\">\r\n            <h3>Columns</h3>\r\n            <gom-lib-button class=\"gom-table-panel__close\" variant=\"secondary\" (buttonClick)=\"closeColumnPanel()\">Close</gom-lib-button>\r\n          </header>\r\n\r\n          <div class=\"gom-table-panel__body\">\r\n            @for (column of columns; track column.key) {\r\n              <label class=\"checkbox-row\">\r\n                <input\r\n                  type=\"checkbox\"\r\n                  [checked]=\"visibleColumnKeys.has(column.key)\"\r\n                  [disabled]=\"column.hideable === false || (visibleColumnKeys.size === 1 && visibleColumnKeys.has(column.key))\"\r\n                  (change)=\"toggleColumn(column.key)\"\r\n                />\r\n                <span>{{ column.header }}</span>\r\n              </label>\r\n            }\r\n          </div>\r\n        </section>\r\n      }\r\n    </div>\r\n  </header>\r\n\r\n  @if (appliedFilterChips.length > 0) {\r\n    <section class=\"gom-table-applied-filters\" aria-label=\"Applied filters\">\r\n      <div class=\"gom-table-applied-filters__chips\">\r\n        @for (filter of appliedFilterChips; track filter.key) {\r\n          <button\r\n            type=\"button\"\r\n            class=\"gom-table-applied-filter\"\r\n            (click)=\"removeAppliedFilter(filter.key)\"\r\n            [attr.aria-label]=\"'Remove ' + filter.label + ' filter'\"\r\n          >{{ filter.label }}: {{ filter.displayValue }} <i class=\"ri-close-circle-line\" aria-hidden=\"true\"></i></button>\r\n        }\r\n        <button type=\"button\" class=\"gom-table-applied-filters__clear\" (click)=\"clearAllFilters()\">Clear All</button>\r\n      </div>\r\n      <span class=\"gom-table-applied-filters__summary\">\r\n        {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} applied \u2022 {{ paginationTotal }} results found\r\n      </span>\r\n    </section>\r\n  }\r\n\r\n  @if (filterNavigationRows.length > 0) {\r\n    <nav class=\"gom-table-filter-navigation\" aria-label=\"Table filters\">\r\n      @for (row of filterNavigationRows; track row.key) {\r\n        <div\r\n          class=\"gom-table-filter-navigation__row\"\r\n          role=\"tablist\"\r\n          [attr.aria-label]=\"row.label || row.key\"\r\n          [attr.data-filter-navigation-row]=\"row.key\"\r\n          (keydown)=\"onFilterNavigationKeydown($event, row.key)\"\r\n        >\r\n          @if (row.label) {\r\n            <span class=\"gom-table-filter-navigation__label\" aria-hidden=\"true\">{{ row.label }}</span>\r\n          }\r\n\r\n          <div\r\n            class=\"gom-table-filter-navigation__options\"\r\n            [attr.data-filter-navigation-options]=\"row.key\"\r\n          >\r\n            @for (option of (isMobileViewport ? getFilterNavigationOptions(row) : getVisibleFilterNavigationOptions(row)); track option.value) {\r\n              <gom-lib-chip\r\n                class=\"gom-table-filter-navigation__option\"\r\n                [class.gom-table-filter-navigation__option--selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                data-filter-navigation-option\r\n                [interactive]=\"true\"\r\n                size=\"compact\"\r\n                [selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                [disabled]=\"option.disabled || false\"\r\n                ariaRole=\"tab\"\r\n                [ariaLabel]=\"option.label\"\r\n                (chipClick)=\"selectFilterNavigationOption(row, option)\"\r\n              >\r\n                <span class=\"gom-table-filter-navigation__option-label\">{{ option.label }}</span>\r\n                @if (row.showCounts && option.count !== undefined) {\r\n                  <span class=\"gom-table-filter-navigation__count\">{{ option.count }}</span>\r\n                }\r\n              </gom-lib-chip>\r\n            }\r\n\r\n            @if (!isMobileViewport && getOverflowFilterNavigationOptions(row).length > 0) {\r\n              <div class=\"gom-table-filter-navigation__more\">\r\n                <gom-lib-button\r\n                  class=\"gom-table-icon-button\"\r\n                  size=\"icon\"\r\n                  [variant]=\"navigationOverflowOpenKey === row.key || hasActiveOverflowFilterNavigationOption(row) ? 'primary' : 'secondary'\"\r\n                  (buttonClick)=\"toggleFilterNavigationOverflow($event, row.key)\"\r\n                  ariaLabel=\"More filter options\"\r\n                  buttonTitle=\"More filter options\"\r\n                  ariaHaspopup=\"menu\"\r\n                  [ariaExpanded]=\"navigationOverflowOpenKey === row.key\"\r\n                ><i class=\"ri-more-2-fill\" aria-hidden=\"true\"></i></gom-lib-button>\r\n\r\n                @if (navigationOverflowOpenKey === row.key) {\r\n                  <div class=\"gom-table-filter-navigation__menu\" role=\"menu\">\r\n                    @for (option of getOverflowFilterNavigationOptions(row); track option.value) {\r\n                      <gom-lib-chip\r\n                        class=\"gom-table-filter-navigation__menu-item\"\r\n                        [class.gom-table-filter-navigation__option--selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                        [interactive]=\"true\"\r\n                        size=\"compact\"\r\n                        [fullWidth]=\"true\"\r\n                        [selected]=\"isFilterNavigationOptionActive(row, option)\"\r\n                        [disabled]=\"option.disabled || false\"\r\n                        ariaRole=\"menuitemradio\"\r\n                        [ariaLabel]=\"option.label\"\r\n                        (chipClick)=\"selectFilterNavigationOption(row, option)\"\r\n                      >\r\n                        <span>{{ option.label }}</span>\r\n                        @if (row.showCounts && option.count !== undefined) {\r\n                          <span class=\"gom-table-filter-navigation__count\">{{ option.count }}</span>\r\n                        }\r\n                      </gom-lib-chip>\r\n                    }\r\n                  </div>\r\n                }\r\n              </div>\r\n            }\r\n          </div>\r\n        </div>\r\n      }\r\n    </nav>\r\n  }\r\n\r\n  <div class=\"gom-table-mobile-result-bar\">\r\n    @if (activeFilterCount > 0) {\r\n      <strong>{{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} applied</strong>\r\n      <span aria-hidden=\"true\">\u2022</span>\r\n    }\r\n    <span>Showing {{ paginationRangeStart }}-{{ paginationRangeEnd }} of {{ paginationTotal }} {{ selectionItemLabel }}{{ paginationTotal === 1 ? '' : 's' }}</span>\r\n  </div>\r\n\r\n  @if (enableRowSelection && hasSelectedRows) {\r\n    <section class=\"gom-table-bulk-actions\" aria-live=\"polite\" aria-label=\"Selected rows actions\">\r\n      <div class=\"gom-table-bulk-actions__summary\">\r\n        <i class=\"ri-checkbox-circle-fill\" aria-hidden=\"true\"></i>\r\n        <strong>{{ selectionSummary }}</strong>\r\n      </div>\r\n\r\n      <div class=\"gom-table-bulk-actions__controls\">\r\n        @for (action of visibleBulkActions; track action.actionKey) {\r\n          <gom-lib-button\r\n            [variant]=\"action.variant || 'secondary'\"\r\n            [disabled]=\"isBulkActionDisabled(action)\"\r\n            [buttonTitle]=\"getBulkActionTitle(action)\"\r\n            (buttonClick)=\"triggerBulkAction(action)\"\r\n          >\r\n            @if (action.icon) {\r\n              <i [class]=\"action.icon\" aria-hidden=\"true\"></i>\r\n            }\r\n            {{ bulkActionBusyKey === action.actionKey ? 'Working...' : action.label }}\r\n          </gom-lib-button>\r\n        }\r\n\r\n        <gom-lib-button\r\n          class=\"gom-table-bulk-actions__clear\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          [disabled]=\"bulkActionBusyKey !== null\"\r\n          ariaLabel=\"Clear row selection\"\r\n          buttonTitle=\"Clear selection\"\r\n          (buttonClick)=\"clearSelectedRows()\"\r\n        ><i class=\"ri-close-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n      </div>\r\n    </section>\r\n  }\r\n\r\n  @if (showInlineEditBanner) {\r\n    <section class=\"gom-table-inline-edit-banner\" aria-live=\"polite\" aria-label=\"Pending inline edit changes\">\r\n      <div class=\"gom-table-inline-edit-banner__summary\">\r\n        @if (inlineEditBannerCount > 0) {\r\n          <span class=\"gom-table-inline-edit-banner__count\">{{ inlineEditBannerCount }}</span>\r\n        }\r\n        <strong>{{ inlineEditBannerSummary }}</strong>\r\n        @if (inlineEditBannerDetail) {\r\n          <span>{{ inlineEditBannerDetail }}</span>\r\n        }\r\n      </div>\r\n\r\n      <div class=\"gom-table-inline-edit-banner__actions\">\r\n        <gom-lib-button\r\n          variant=\"secondary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditDiscardAll.emit()\"\r\n        >{{ inlineEditBannerDiscardLabel }}</gom-lib-button>\r\n\r\n        <gom-lib-button\r\n          variant=\"secondary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditSaveAll.emit()\"\r\n        >{{ inlineEditBannerSaving ? 'Saving...' : inlineEditBannerSaveLabel }}</gom-lib-button>\r\n\r\n        <gom-lib-button\r\n          variant=\"primary\"\r\n          [disabled]=\"inlineEditBannerSaving\"\r\n          (buttonClick)=\"inlineEditReviewChanges.emit()\"\r\n        >{{ inlineEditBannerReviewLabel }}</gom-lib-button>\r\n      </div>\r\n    </section>\r\n  }\r\n\r\n  <div class=\"gom-table-wrap\">\r\n    <table class=\"gom-table\">\r\n      <thead>\r\n        <tr>\r\n          @if (enableRowSelection) {\r\n            <th scope=\"col\" class=\"gom-table-selection-col\">\r\n              <input\r\n                type=\"checkbox\"\r\n                [checked]=\"areAllDisplayedRowsSelected()\"\r\n                [disabled]=\"loading || displayedRows.length === 0\"\r\n                (change)=\"toggleSelectAllDisplayedRows($any($event.target).checked)\"\r\n                aria-label=\"Select all rows\"\r\n              />\r\n            </th>\r\n          }\r\n          @for (column of visibleColumns; track column.key) {\r\n            <th\r\n              scope=\"col\"\r\n              [style.width]=\"column.width\"\r\n              [class]=\"'align-' + getHeaderAlign(column)\"\r\n              [class.gom-table-header--actions]=\"hasActionButtons(column)\"\r\n              [class.sortable]=\"column.sortable\"\r\n              [attr.tabindex]=\"column.sortable ? 0 : null\"\r\n              [attr.role]=\"column.sortable ? 'button' : null\"\r\n              (click)=\"setSort(column)\"\r\n              (keydown)=\"handleHeaderKeydown($event, column)\"\r\n            >\r\n              <span>{{ column.header }}</span>\r\n              @if (column.sortable && getSortDirection(column.key)) {\r\n                <span class=\"sort-indicator\" aria-hidden=\"true\">\r\n                  @if (getSortDirection(column.key) === 'asc') {\r\n                    <i class=\"ri-arrow-up-s-line\"></i>\r\n                  }\r\n                  @if (getSortDirection(column.key) === 'desc') {\r\n                    <i class=\"ri-arrow-down-s-line\"></i>\r\n                  }\r\n                </span>\r\n              }\r\n            </th>\r\n          }\r\n        </tr>\r\n\r\n        @if (hasInlineFilters) {\r\n          <tr class=\"gom-table-filter-row\">\r\n            @if (enableRowSelection) {\r\n              <th scope=\"col\" class=\"gom-table-selection-col\"></th>\r\n            }\r\n            @for (column of visibleColumns; track column.key) {\r\n              <th scope=\"col\">\r\n                @if (column.filterable) {\r\n                  <gom-lib-input\r\n                    class=\"gom-table-column-filter\"\r\n                    type=\"search\"\r\n                    [placeholder]=\"'Search ' + column.header\"\r\n                    [id]=\"'filter-' + column.key\"\r\n                    [ngModel]=\"filters[column.key] || ''\"\r\n                    (click)=\"$event.stopPropagation()\"\r\n                    (keydown)=\"$event.stopPropagation()\"\r\n                    (ngModelChange)=\"setFilter(column.key, $event)\"\r\n                  ></gom-lib-input>\r\n                } @else {\r\n                  <span class=\"gom-table-filter-spacer\"></span>\r\n                }\r\n              </th>\r\n            }\r\n          </tr>\r\n        }\r\n      </thead>\r\n\r\n      <tbody>\r\n        @if (loading) {\r\n          @for (skeletonRow of skeletonRows; track skeletonRow) {\r\n            <tr class=\"gom-table-skeleton-row\">\r\n              @if (enableRowSelection) {\r\n                <td class=\"gom-table-selection-col gom-table-skeleton-cell\">\r\n                  <span class=\"gom-table-skeleton-box\"></span>\r\n                </td>\r\n              }\r\n              @for (column of visibleColumns; track column.key) {\r\n                <td class=\"gom-table-skeleton-cell\">\r\n                  <span class=\"gom-table-skeleton-line\"></span>\r\n                </td>\r\n              }\r\n            </tr>\r\n          }\r\n        } @else if (displayedRows.length === 0) {\r\n          <tr>\r\n            <td [attr.colspan]=\"visibleColumns.length + (enableRowSelection ? 1 : 0)\" class=\"state-cell\">{{ emptyMessage }}</td>\r\n          </tr>\r\n        } @else {\r\n          @for (row of displayedRows; track trackByRow($index); let rowIndex = $index) {\r\n            <tr>\r\n              @if (enableRowSelection) {\r\n                <td class=\"gom-table-selection-col\">\r\n                  <input\r\n                    type=\"checkbox\"\r\n                    [checked]=\"isRowSelected(row, rowIndex)\"\r\n                    (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n                    [attr.aria-label]=\"'Select row ' + (rowIndex + 1)\"\r\n                  />\r\n                </td>\r\n              }\r\n              @for (column of visibleColumns; track column.key) {\r\n                <td\r\n                  [class]=\"'align-' + getCellAlign(column) + ' text-' + getTextMode(column) + ' ' + getCellClass(row, column)\"\r\n                  [class.gom-table-cell--actions]=\"hasActionButtons(column)\"\r\n                  [class.gom-table-cell--editable]=\"!!getEditableConfig(column)\"\r\n                  [class.gom-table-cell--editing]=\"isCellEditing(row, column)\"\r\n                  [attr.title]=\"isCellEditing(row, column) ? null : getCellTitle(row, column)\"\r\n                >\r\n                  @if (hasActionButtons(column)) {\r\n                    <div class=\"gom-table-actions\">\r\n                      @for (action of getInlineActionButtons(column); track action.actionKey) {\r\n                        @if (getSubActions(action).length > 0) {\r\n                          <div class=\"gom-table-action-menu\" [class.gom-table-action-menu--open]=\"isSubmenuOpen(action, row, rowIndex)\">\r\n                            <gom-lib-button\r\n                              class=\"gom-table-actions__button\"\r\n                              [variant]=\"action.variant || 'secondary'\"\r\n                              size=\"icon\"\r\n                              [disabled]=\"isActionDisabled(action, row)\"\r\n                              [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                              [attr.title]=\"getActionTitle(action, row)\"\r\n                              (buttonClick)=\"toggleSubmenu($event, action, row, rowIndex)\"\r\n                            >\r\n                              @if (getActionIcon(action, row); as iconClass) {\r\n                                <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                              } @else {\r\n                                <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                              }\r\n                            </gom-lib-button>\r\n\r\n                            @if (isSubmenuOpen(action, row, rowIndex)) {\r\n                              <div class=\"gom-table-submenu\" [ngStyle]=\"submenuPosition\" (click)=\"$event.stopPropagation()\">\r\n                                @for (subAction of getSubActions(action); track subAction.actionKey) {\r\n                                  <gom-lib-button\r\n                                    class=\"gom-table-submenu__item\"\r\n                                    [variant]=\"subAction.variant || 'secondary'\"\r\n                                    [disabled]=\"isActionDisabled(subAction, row)\"\r\n                                    [attr.title]=\"getActionTitle(subAction, row)\"\r\n                                    (buttonClick)=\"onSubmenuActionClick($event, subAction.actionKey, row)\"\r\n                                  >\r\n                                    {{ getActionLabel(subAction, row) }}\r\n                                  </gom-lib-button>\r\n                                }\r\n                              </div>\r\n                            }\r\n                          </div>\r\n                        } @else {\r\n                          <span [attr.title]=\"isActionDisabled(action, row) ? getActionTitle(action, row) : null\" style=\"display:inline-flex;\">\r\n                          <gom-lib-button\r\n                            class=\"gom-table-actions__button\"\r\n                            [variant]=\"action.variant || 'secondary'\"\r\n                            size=\"icon\"\r\n                            [disabled]=\"isActionDisabled(action, row)\"\r\n                            [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                            [attr.title]=\"isActionDisabled(action, row) ? null : getActionTitle(action, row)\"\r\n                            (buttonClick)=\"triggerRowAction(action.actionKey, row)\"\r\n                          >\r\n                            @if (getActionIcon(action, row); as iconClass) {\r\n                              <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                            } @else {\r\n                              <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                            }\r\n                          </gom-lib-button>\r\n                          </span>\r\n                        }\r\n                      }\r\n\r\n                      @if (hasOverflowMenu(column)) {\r\n                        <div class=\"gom-table-action-overflow\" #actionOverflowBoundary>\r\n                          <core-lib-menu\r\n                            #actionOverflowMenu\r\n                            [menuType]=\"'submenu'\"\r\n                            [outsideClickBoundary]=\"actionOverflowBoundary\"\r\n                            [menuList]=\"getOverflowMenuList(column, row)\"\r\n                            [showMenuListArrow]=\"false\"\r\n                            [showMobileBackArrow]=\"false\"\r\n                            [backButtonText]=\"getOverflowMenuBackButtonText(column)\"\r\n                          ></core-lib-menu>\r\n\r\n                          <gom-lib-button\r\n                            class=\"gom-table-actions__button\"\r\n                            variant=\"secondary\"\r\n                            size=\"icon\"\r\n                            [ariaLabel]=\"getOverflowMenuTriggerAriaLabel(column)\"\r\n                            [buttonTitle]=\"getOverflowMenuTriggerTitle(column)\"\r\n                            (buttonClick)=\"actionOverflowMenu.toggle()\"\r\n                          >\r\n                            <i [class]=\"getOverflowMenuTriggerIcon(column)\" aria-hidden=\"true\"></i>\r\n                          </gom-lib-button>\r\n                        </div>\r\n                      }\r\n                    </div>\r\n                  } @else if (getEditableConfig(column)) {\r\n                    @if (isCellEditing(row, column)) {\r\n                      <gom-lib-input\r\n                        class=\"gom-table-cell-editor\"\r\n                        [type]=\"getCellEditInputType(column)\"\r\n                        [inputmode]=\"getCellEditInputMode(column)\"\r\n                        [min]=\"getEditableConfig(column)?.min\"\r\n                        [max]=\"getEditableConfig(column)?.max\"\r\n                        [step]=\"getEditableConfig(column)?.step\"\r\n                        [disabled]=\"isCellEditDisabled(row, column)\"\r\n                        [ariaLabel]=\"'Edit ' + column.header\"\r\n                        [error]=\"getCellEditError(row, column)\"\r\n                        [ngModel]=\"getCellDraft(row, column)\"\r\n                        (ngModelChange)=\"setCellDraft(row, column, $event)\"\r\n                        (keydown)=\"onCellEditorKeydown($event, row, column)\"\r\n                        (focusout)=\"commitCellEdit(row, column)\"\r\n                        (click)=\"$event.stopPropagation()\"\r\n                      ></gom-lib-input>\r\n                    } @else if (!isCellEditDisabled(row, column)) {\r\n                      <button\r\n                        type=\"button\"\r\n                        class=\"gom-table-cell-edit-trigger\"\r\n                        [attr.aria-label]=\"'Edit ' + column.header + ': ' + getCellValue(row, column)\"\r\n                        (click)=\"startCellEdit($event, row, column)\"\r\n                        (keydown)=\"onCellEditTriggerKeydown($event, row, column)\"\r\n                      >{{ getCellValue(row, column) }}</button>\r\n                    } @else {\r\n                      {{ getCellValue(row, column) }}\r\n                    }\r\n                  } @else {\r\n                    @if (getCellActionKey(row, column); as cellActionKey) {\r\n                      <button\r\n                        type=\"button\"\r\n                        class=\"gom-table-cell-action\"\r\n                        [class.gom-table-cell-action--chip]=\"!!column.chipTone\"\r\n                        [attr.title]=\"getCellTitle(row, column)\"\r\n                        (click)=\"onCellActionClick($event, cellActionKey, row)\"\r\n                        (keydown)=\"onCellActionKeydown($event, cellActionKey, row)\"\r\n                      >\r\n                        @if (column.chipTone) {\r\n                          <gom-lib-chip [tone]=\"getChipTone(row, column)\">{{ getCellValue(row, column) }}</gom-lib-chip>\r\n                        } @else {\r\n                          <span>{{ getCellValue(row, column) }}</span>\r\n                          @if (getCellActionIcon(row, column); as cellActionIcon) {\r\n                            <i [class]=\"cellActionIcon\" class=\"gom-table-cell-action__icon\" aria-hidden=\"true\"></i>\r\n                          }\r\n                        }\r\n                      </button>\r\n                    } @else {\r\n                      @if (column.chipTone) {\r\n                        <gom-lib-chip [tone]=\"getChipTone(row, column)\">{{ getCellValue(row, column) }}</gom-lib-chip>\r\n                      } @else {\r\n                        {{ getCellValue(row, column) }}\r\n                      }\r\n                    }\r\n                  }\r\n                </td>\r\n              }\r\n            </tr>\r\n          }\r\n        }\r\n      </tbody>\r\n    </table>\r\n  </div>\r\n\r\n  @if (showPagination) {\r\n    <footer class=\"gom-table-footer\">\r\n      <div class=\"gom-table-footer__summary\" aria-live=\"polite\">\r\n        Showing <strong>{{ paginationRangeStart }}</strong> to <strong>{{ paginationRangeEnd }}</strong>\r\n        of <strong>{{ paginationTotal }}</strong> {{ selectionItemLabel }}{{ paginationTotal === 1 ? '' : 's' }}\r\n      </div>\r\n\r\n      <nav class=\"gom-table-pagination\" aria-label=\"Table pagination\">\r\n        <gom-lib-button\r\n          class=\"gom-table-pager-button\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"previousPage()\"\r\n          [disabled]=\"!canGoPrevious\"\r\n          ariaLabel=\"Previous page\"\r\n          buttonTitle=\"Previous page\"\r\n        >\r\n          <i class=\"ri-arrow-left-s-line\" aria-hidden=\"true\"></i>\r\n        </gom-lib-button>\r\n\r\n        <div class=\"gom-table-pagination__pages\">\r\n          @for (item of paginationItems; track item) {\r\n            @if (typeof item === 'number') {\r\n              <gom-lib-button\r\n                class=\"gom-table-page-button\"\r\n                [variant]=\"item === pageIndex + 1 ? 'primary' : 'secondary'\"\r\n                [ariaCurrent]=\"item === pageIndex + 1 ? 'page' : null\"\r\n                [ariaLabel]=\"'Page ' + item\"\r\n                [buttonTitle]=\"'Go to page ' + item\"\r\n                (buttonClick)=\"goToPage(item)\"\r\n              >{{ item }}</gom-lib-button>\r\n            } @else {\r\n              <span class=\"gom-table-pagination__ellipsis\" aria-hidden=\"true\">&hellip;</span>\r\n            }\r\n          }\r\n        </div>\r\n\r\n        <gom-lib-button\r\n          class=\"gom-table-pager-button\"\r\n          variant=\"secondary\"\r\n          size=\"icon\"\r\n          (buttonClick)=\"nextPage()\"\r\n          [disabled]=\"!canGoNext\"\r\n          ariaLabel=\"Next page\"\r\n          buttonTitle=\"Next page\"\r\n        >\r\n          <i class=\"ri-arrow-right-s-line\" aria-hidden=\"true\"></i>\r\n        </gom-lib-button>\r\n\r\n        <gom-lib-select\r\n          class=\"gom-table-page-size-select\"\r\n          ariaLabel=\"Rows per page\"\r\n          [placeholder]=\"'Show ' + pageSize\"\r\n          [options]=\"pageSizeSelectOptions\"\r\n          [ngModel]=\"pageSizeModel\"\r\n          (ngModelChange)=\"onPageSizeSelectChange($event)\"\r\n        ></gom-lib-select>\r\n      </nav>\r\n    </footer>\r\n  }\r\n</section>\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"advancedFilterModalOpen\"\r\n  title=\"Filters\"\r\n  size=\"large\"\r\n  mobilePresentation=\"fullscreen\"\r\n  headerActionLabel=\"Reset All\"\r\n  (headerAction)=\"clearDraftAdvancedFilters()\"\r\n  [closeOnBackdropClick]=\"true\"\r\n  (closed)=\"closeAdvancedFilters()\"\r\n>\r\n  <div class=\"gom-table-advanced-filters\">\r\n    @for (filter of panelFilterDefinitions; track filter.key) {\r\n      @if (isMobileViewport && (filter.mobileControl === 'checkboxes' || filter.mobileControl === 'chips' || filter.mobileControl === 'radio')) {\r\n        <fieldset class=\"gom-table-mobile-filter-group\" [class.gom-table-mobile-filter-group--chips]=\"filter.mobileControl === 'chips'\">\r\n          <legend>{{ filter.label }}</legend>\r\n          <div class=\"gom-table-mobile-filter-options\">\r\n            @for (option of getFilterOptions(filter); track option.value) {\r\n              <label\r\n                class=\"gom-table-mobile-filter-option\"\r\n                [class.gom-table-mobile-filter-option--selected]=\"isDraftOptionSelected(filter.key, option.value)\"\r\n              >\r\n                <input\r\n                  [type]=\"filter.mobileControl === 'checkboxes' ? 'checkbox' : 'radio'\"\r\n                  [name]=\"'mobile-filter-' + filter.key\"\r\n                  [checked]=\"isDraftOptionSelected(filter.key, option.value)\"\r\n                  (change)=\"toggleDraftFilterOption(filter, option.value)\"\r\n                />\r\n                <span>{{ option.label }}</span>\r\n                @if (getFilterOptionCount(filter, option.value); as count) {\r\n                  <small>({{ count }})</small>\r\n                }\r\n              </label>\r\n            }\r\n          </div>\r\n        </fieldset>\r\n      } @else if (filter.type === 'text') {\r\n        <gom-lib-input\r\n          [label]=\"filter.label\"\r\n          type=\"text\"\r\n          [placeholder]=\"filter.placeholder || filter.label\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-input>\r\n      } @else if (filter.type === 'date') {\r\n        <gom-lib-input\r\n          [label]=\"filter.label\"\r\n          type=\"date\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-input>\r\n      } @else if (filter.type === 'select') {\r\n        <gom-lib-select\r\n          [label]=\"filter.label\"\r\n          [placeholder]=\"filter.placeholder || ('Select ' + filter.label)\"\r\n          [options]=\"getFilterOptions(filter)\"\r\n          [searchable]=\"filter.searchable || false\"\r\n          [ngModel]=\"getFilterString(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-select>\r\n      } @else if (filter.type === 'multi-select') {\r\n        <gom-lib-select\r\n          [label]=\"filter.label\"\r\n          [placeholder]=\"filter.placeholder || ('Select ' + filter.label)\"\r\n          [options]=\"getFilterOptions(filter)\"\r\n          [multiple]=\"true\"\r\n          [searchable]=\"filter.searchable ?? true\"\r\n          [ngModel]=\"getFilterArray(draftAdvancedFilters, filter.key)\"\r\n          (ngModelChange)=\"setDraftFilterValue(filter.key, $event)\"\r\n        ></gom-lib-select>\r\n      } @else if (filter.type === 'date-range') {\r\n        <fieldset class=\"gom-table-date-range\">\r\n          <legend>{{ filter.label }}</legend>\r\n          <gom-lib-input\r\n            label=\"From\"\r\n            type=\"date\"\r\n            [ngModel]=\"getFilterRange(draftAdvancedFilters, filter.key).from\"\r\n            (ngModelChange)=\"setDraftDateRangeValue(filter.key, 'from', $event)\"\r\n          ></gom-lib-input>\r\n          <gom-lib-input\r\n            label=\"To\"\r\n            type=\"date\"\r\n            [ngModel]=\"getFilterRange(draftAdvancedFilters, filter.key).to\"\r\n            (ngModelChange)=\"setDraftDateRangeValue(filter.key, 'to', $event)\"\r\n          ></gom-lib-input>\r\n        </fieldset>\r\n      }\r\n    } @empty {\r\n      <p class=\"gom-table-advanced-filters__empty\">No filters are configured for this table.</p>\r\n    }\r\n  </div>\r\n\r\n  <footer class=\"gom-table-filter-actions\" gom-modal-actions>\r\n    <span class=\"gom-table-filter-actions__summary\">{{ draftAdvancedFilterCount }} filters selected</span>\r\n    <div class=\"gom-table-filter-actions__end\">\r\n      <gom-lib-button type=\"button\" variant=\"secondary\" (buttonClick)=\"closeAdvancedFilters()\">Cancel</gom-lib-button>\r\n      <gom-lib-button class=\"gom-table-filter-actions__apply\" type=\"button\" variant=\"primary\" (buttonClick)=\"applyAdvancedFilters()\">Apply filters ({{ draftAdvancedFilterCount }})</gom-lib-button>\r\n    </div>\r\n  </footer>\r\n</gom-lib-modal>\r\n\r\n@if (mobileCardView) {\r\n  <section class=\"gom-card-list\">\r\n    @if (loading) {\r\n      @for (skeletonRow of skeletonRows; track skeletonRow) {\r\n        <gom-lib-card class=\"gom-card-item gom-card-item--skeleton\" [contentGap]=\"false\" aria-hidden=\"true\">\r\n          <div class=\"gom-card__skeleton-line gom-card__skeleton-line--title\"></div>\r\n          <div class=\"gom-card__skeleton-line\"></div>\r\n          <div class=\"gom-card__skeleton-line gom-card__skeleton-line--wide\"></div>\r\n        </gom-lib-card>\r\n      }\r\n    } @else if (displayedRows.length === 0) {\r\n      <gom-lib-card>\r\n        <p class=\"gom-card__state\">{{ emptyMessage }}</p>\r\n      </gom-lib-card>\r\n    } @else {\r\n      @for (row of displayedRows; track trackByRow($index); let rowIndex = $index) {\r\n        <gom-lib-card\r\n          class=\"gom-card-item\"\r\n          [contentGap]=\"false\"\r\n          [class.gom-card-item--clickable]=\"mobileCardClickable\"\r\n          [class.gom-card-item--selected]=\"isRowSelected(row, rowIndex)\"\r\n          (click)=\"onMobileCardClick(row)\"\r\n          (keydown.enter)=\"onMobileCardClick(row)\"\r\n        >\r\n          @if (mobileCardConfig) {\r\n            <div class=\"gom-card__config\">\r\n              <div class=\"gom-card__header\">\r\n                @if (enableRowSelection) {\r\n                  <label class=\"gom-card__checkbox\">\r\n                    <input\r\n                      type=\"checkbox\"\r\n                      [checked]=\"isRowSelected(row, rowIndex)\"\r\n                      (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n                      [attr.aria-label]=\"'Select ' + getMobileCardTitle(row, rowIndex)\"\r\n                    />\r\n                  </label>\r\n                }\r\n\r\n                <div class=\"gom-card__identity gom-card__identity--stacked\">\r\n                  <div>\r\n                    <strong class=\"gom-card__primary\">{{ getMobileCardTitle(row, rowIndex) }}</strong>\r\n                    @if (getMobileCardSubtitleParts(row).length > 0) {\r\n                      <small class=\"gom-card__subtitle\">\r\n                        @for (part of getMobileCardSubtitleParts(row); track part; let last = $last) {\r\n                          <span>{{ part }}</span>\r\n                          @if (!last) {\r\n                            <span class=\"gom-card__subtitle-separator\" aria-hidden=\"true\">\u2022</span>\r\n                          }\r\n                        }\r\n                      </small>\r\n                    }\r\n                  </div>\r\n                </div>\r\n\r\n                @if (hasMobileCardStatus(row)) {\r\n                  <gom-lib-chip class=\"gom-card__status-chip\" size=\"dense\" [tone]=\"getMobileCardStatusTone(row)\">\r\n                    {{ getMobileCardStatusLabel(row) }}\r\n                  </gom-lib-chip>\r\n                }\r\n\r\n                @if (getMobileCardOverflowActions(row).length > 0) {\r\n                  <div class=\"gom-card__overflow\" #cardOverflowBoundary>\r\n                    <core-lib-menu\r\n                      #cardOverflowMenu\r\n                      [menuType]=\"'submenu'\"\r\n                      [outsideClickBoundary]=\"cardOverflowBoundary\"\r\n                      [menuList]=\"getMobileCardOverflowMenuList(row)\"\r\n                      [showMenuListArrow]=\"false\"\r\n                      [showMobileBackArrow]=\"false\"\r\n                      [backButtonText]=\"'Actions'\"\r\n                    ></core-lib-menu>\r\n\r\n                    <gom-lib-button\r\n                      class=\"gom-card__menu-trigger\"\r\n                      variant=\"ghost\"\r\n                      size=\"compact-icon\"\r\n                      ariaLabel=\"More actions\"\r\n                      (buttonClick)=\"cardOverflowMenu.toggle()\"\r\n                    ><i class=\"ri-more-2-fill\" aria-hidden=\"true\"></i></gom-lib-button>\r\n                  </div>\r\n                }\r\n              </div>\r\n\r\n              <div [ngClass]=\"hasMobileCardBody(row, rowIndex) ? 'gom-card__body' : 'gom-card__body--hidden'\">\r\n                  @if (getMobileCardVisibleFields(row).length > 0) {\r\n                    <div class=\"gom-card__field-grid\">\r\n                      @for (field of getMobileCardVisibleFields(row); track field.key) {\r\n                        @if (!isMobileCardFieldHidden(row, field)) {\r\n                          <div class=\"gom-card__field\" [class.gom-card__field--full]=\"getMobileCardFieldWidth(field) === 'full'\">\r\n                            <span class=\"gom-card__label\">{{ getMobileCardFieldLabel(row, field) }}</span>\r\n                            <span class=\"gom-card__value\">{{ getMobileCardFieldValue(row, field) }}</span>\r\n                          </div>\r\n                        }\r\n                      }\r\n                    </div>\r\n                  }\r\n\r\n                  @if (shouldShowMobileCardDetailsToggle(row)) {\r\n                    <button\r\n                      type=\"button\"\r\n                      class=\"gom-card__details-toggle\"\r\n                      (click)=\"toggleMobileCardDetails($event, row, rowIndex)\"\r\n                    >\r\n                      {{ getMobileCardDetailsToggleLabel(row, rowIndex) }}\r\n                    </button>\r\n                  }\r\n\r\n                  @if (isMobileCardExpanded(row, rowIndex) && getMobileCardExpandableFields(row).length > 0) {\r\n                    <div class=\"gom-card__field-grid gom-card__field-grid--expanded\">\r\n                      @for (field of getMobileCardExpandableFields(row); track field.key) {\r\n                        @if (!isMobileCardFieldHidden(row, field)) {\r\n                          <div class=\"gom-card__field\" [class.gom-card__field--full]=\"getMobileCardFieldWidth(field) === 'full'\">\r\n                            <span class=\"gom-card__label\">{{ getMobileCardFieldLabel(row, field) }}</span>\r\n                            <span class=\"gom-card__value\">{{ getMobileCardFieldValue(row, field) }}</span>\r\n                          </div>\r\n                        }\r\n                      }\r\n                    </div>\r\n                  }\r\n                </div>\r\n\r\n              @if (getMobileCardPrimaryActions(row).length > 0) {\r\n                <div class=\"gom-card__footer\" [class.gom-card__footer--icon-only]=\"!showMobileCardPrimaryActionLabels()\">\r\n                  @for (action of getMobileCardPrimaryActions(row); track action.actionKey) {\r\n                    <gom-lib-button\r\n                      class=\"gom-card__footer-action\"\r\n                      [class.gom-card__footer-action--icon-only]=\"!showMobileCardPrimaryActionLabels()\"\r\n                      variant=\"ghost\"\r\n                      [size]=\"showMobileCardPrimaryActionLabels() ? 'default' : 'compact-icon'\"\r\n                      [disabled]=\"isActionDisabled(action, row)\"\r\n                      [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                      [attr.title]=\"getActionTitle(action, row)\"\r\n                      (buttonClick)=\"onMobileCardOverflowActionClick($event, action.actionKey, row)\"\r\n                    >\r\n                      @if (getMobileCardActionIcon(action, row); as iconClass) {\r\n                        <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                      }\r\n                      @if (showMobileCardPrimaryActionLabels()) {\r\n                        <span>{{ getMobileCardActionLabel(action, row) }}</span>\r\n                      }\r\n                    </gom-lib-button>\r\n                  }\r\n                </div>\r\n              }\r\n            </div>\r\n          } @else {\r\n          @if (enableRowSelection) {\r\n            <label class=\"gom-card__selection\">\r\n              <input\r\n                type=\"checkbox\"\r\n                [checked]=\"isRowSelected(row, rowIndex)\"\r\n                (change)=\"toggleRowSelection(row, rowIndex, $any($event.target).checked)\"\r\n              />\r\n              <span>Select row {{ rowIndex + 1 }}</span>\r\n            </label>\r\n          }\r\n          @for (column of mobileCardColumns; track column.key) {\r\n            <div class=\"gom-card__row\">\r\n              <h5 class=\"gom-card__label\">{{ column.header }}</h5>\r\n              <p [class]=\"'gom-card__value text-' + getTextMode(column)\">{{ getCellValue(row, column) }}</p>\r\n            </div>\r\n          }\r\n\r\n          @if (getMobileCardActions(row).length > 0) {\r\n            <div class=\"gom-card__footer gom-card__footer--icon-only\" (click)=\"$event.stopPropagation()\">\r\n              @for (action of getMobileCardActions(row); track action.actionKey) {\r\n                @if (getSubActions(action).length > 0) {\r\n                  <div class=\"gom-table-action-menu\" [class.gom-table-action-menu--open]=\"isSubmenuOpen(action, row, $index)\">\r\n                    <gom-lib-button\r\n                      class=\"gom-card__footer-action gom-card__footer-action--icon-only\"\r\n                      variant=\"ghost\"\r\n                      size=\"compact-icon\"\r\n                      [disabled]=\"isActionDisabled(action, row)\"\r\n                      [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                      [attr.title]=\"getActionTitle(action, row)\"\r\n                      (buttonClick)=\"toggleSubmenu($event, action, row, $index)\"\r\n                    >\r\n                      @if (getActionIcon(action, row); as iconClass) {\r\n                        <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                      } @else {\r\n                        <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                      }\r\n                    </gom-lib-button>\r\n\r\n                    @if (isSubmenuOpen(action, row, $index)) {\r\n                      <div class=\"gom-table-submenu\" [ngStyle]=\"submenuPosition\" (click)=\"$event.stopPropagation()\">\r\n                        @for (subAction of getSubActions(action); track subAction.actionKey) {\r\n                          <gom-lib-button\r\n                            class=\"gom-table-submenu__item\"\r\n                            [variant]=\"subAction.variant || 'secondary'\"\r\n                            [disabled]=\"isActionDisabled(subAction, row)\"\r\n                            [attr.title]=\"getActionTitle(subAction, row)\"\r\n                            (buttonClick)=\"onSubmenuActionClick($event, subAction.actionKey, row)\"\r\n                          >\r\n                            {{ getActionLabel(subAction, row) }}\r\n                          </gom-lib-button>\r\n                        }\r\n                      </div>\r\n                    }\r\n                  </div>\r\n                } @else {\r\n                <gom-lib-button\r\n                  class=\"gom-card__footer-action gom-card__footer-action--icon-only\"\r\n                  variant=\"ghost\"\r\n                  size=\"compact-icon\"\r\n                  [disabled]=\"isActionDisabled(action, row)\"\r\n                  [attr.aria-label]=\"getActionLabel(action, row)\"\r\n                  [attr.title]=\"getActionTitle(action, row)\"\r\n                  (buttonClick)=\"onMobileCardActionClick($event, action.actionKey, row)\"\r\n                >\r\n                  @if (getActionIcon(action, row); as iconClass) {\r\n                    <i [class]=\"iconClass\" aria-hidden=\"true\"></i>\r\n                  } @else {\r\n                    <i class=\"ri-more-line\" aria-hidden=\"true\"></i>\r\n                  }\r\n                </gom-lib-button>\r\n                }\r\n              }\r\n            </div>\r\n          }\r\n          }\r\n        </gom-lib-card>\r\n      }\r\n    }\r\n  </section>\r\n\r\n  @if (showPagination) {\r\n    <footer class=\"gom-table-mobile-pagination\">\r\n      @if (mobilePaginationMode === 'load-more') {\r\n        @if (canGoNext || loading) {\r\n          @if (mobileAutoLoadMore) {\r\n            <span #mobileLoadMoreSentinel class=\"gom-table-mobile-load-more-sentinel\" aria-hidden=\"true\"></span>\r\n          }\r\n          <gom-lib-button class=\"gom-table-mobile-load-more\" variant=\"secondary\" [disabled]=\"!canGoNext || loading\" (buttonClick)=\"requestLoadMore()\">\r\n            Load More {{ selectionItemLabel }}s\r\n          </gom-lib-button>\r\n        }\r\n      } @else {\r\n        <nav class=\"gom-table-pagination\" aria-label=\"Mobile table pagination\">\r\n          <gom-lib-button variant=\"secondary\" size=\"icon\" [disabled]=\"!canGoPrevious\" ariaLabel=\"Previous page\" (buttonClick)=\"previousPage()\"><i class=\"ri-arrow-left-s-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n          <div class=\"gom-table-pagination__pages\">\r\n            @for (item of paginationItems; track item) {\r\n              @if (typeof item === 'number') {\r\n                <gom-lib-button [variant]=\"item === pageIndex + 1 ? 'primary' : 'secondary'\" [ariaCurrent]=\"item === pageIndex + 1 ? 'page' : null\" [ariaLabel]=\"'Page ' + item\" (buttonClick)=\"goToPage(item)\">{{ item }}</gom-lib-button>\r\n              } @else { <span class=\"gom-table-pagination__ellipsis\">&hellip;</span> }\r\n            }\r\n          </div>\r\n          <gom-lib-button variant=\"secondary\" size=\"icon\" [disabled]=\"!canGoNext\" ariaLabel=\"Next page\" (buttonClick)=\"nextPage()\"><i class=\"ri-arrow-right-s-line\" aria-hidden=\"true\"></i></gom-lib-button>\r\n        </nav>\r\n      }\r\n    </footer>\r\n  }\r\n}\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"mobileTableOptionsOpen\"\r\n  [title]=\"mobileViewMode === 'cards' ? 'List Options' : 'Table Options'\"\r\n  mobilePresentation=\"sheet\"\r\n  (closed)=\"closeMobileTableOptions()\"\r\n>\r\n  <div class=\"gom-table-mobile-sheet-list\">\r\n    @if (showExport) {\r\n      <button type=\"button\" (click)=\"exportClick.emit(); closeMobileTableOptions()\"><i class=\"ri-download-2-line\"></i><span>Export</span></button>\r\n    }\r\n    @if (mobileViewMode === 'cards') {\r\n      @for (column of mobileSortColumns; track column.key) {\r\n        <button type=\"button\" (click)=\"setMobileSort(column)\"><i class=\"ri-sort-desc\"></i><span>Sort by {{ column.header }}</span>@if (sortState.key === column.key) { <small>{{ mobileSortLabel }}</small> }</button>\r\n      }\r\n    } @else {\r\n      @if (enableColumnSearch) {\r\n        <button type=\"button\" (click)=\"toggleMobileColumnSearch()\">\r\n          <i [class]=\"filtersVisible ? 'ri-search-eye-line' : 'ri-search-line'\" aria-hidden=\"true\"></i>\r\n          <span>{{ filtersVisible ? 'Hide column search' : 'Show column search' }}</span>\r\n        </button>\r\n      }\r\n      @if (enableColumnVisibility) {\r\n        <button type=\"button\" (click)=\"openMobileColumnPanel()\">\r\n          <i class=\"ri-layout-column-line\" aria-hidden=\"true\"></i>\r\n          <span>Manage columns</span>\r\n        </button>\r\n      }\r\n    }\r\n    @if (activeFilterCount > 0) {\r\n      <button type=\"button\" class=\"gom-table-mobile-sheet-list__danger\" (click)=\"clearAllFilters(); closeMobileTableOptions()\"><i class=\"ri-delete-bin-line\"></i><span>Clear All Filters</span></button>\r\n    }\r\n  </div>\r\n</gom-lib-modal>\r\n\r\n@if (isMobileViewport) {\r\n  <gom-lib-modal\r\n    [(show)]=\"columnPanelOpen\"\r\n    title=\"Manage Columns\"\r\n    mobilePresentation=\"sheet\"\r\n    (closed)=\"closeColumnPanel()\"\r\n  >\r\n    <div class=\"gom-table-mobile-columns\">\r\n      <p>Select the columns to display in table view.</p>\r\n      <div class=\"gom-table-mobile-columns__list\">\r\n        @for (column of columns; track column.key) {\r\n          <label class=\"gom-table-mobile-columns__option\">\r\n            <input\r\n              type=\"checkbox\"\r\n              [checked]=\"visibleColumnKeys.has(column.key)\"\r\n              [disabled]=\"column.hideable === false || (visibleColumnKeys.size === 1 && visibleColumnKeys.has(column.key))\"\r\n              (change)=\"toggleColumn(column.key)\"\r\n            />\r\n            <span>{{ column.header }}</span>\r\n          </label>\r\n        }\r\n      </div>\r\n    </div>\r\n  </gom-lib-modal>\r\n}\r\n\r\n<gom-lib-modal\r\n  [(show)]=\"mobileRowActionsOpen\"\r\n  [title]=\"mobileRowActionTarget && mobileCardConfig ? getMobileCardTitle(mobileRowActionTarget, 0) : 'Row Actions'\"\r\n  mobilePresentation=\"sheet\"\r\n  (closed)=\"closeMobileRowActions()\"\r\n>\r\n  @if (mobileRowActionTarget) {\r\n    <div class=\"gom-table-mobile-sheet-list\">\r\n      @for (action of getMobileRowSheetActions(mobileRowActionTarget); track action.actionKey) {\r\n        <button\r\n          type=\"button\"\r\n          [class.gom-table-mobile-sheet-list__danger]=\"action.variant === 'danger'\"\r\n          [disabled]=\"isActionDisabled(action, mobileRowActionTarget)\"\r\n          (click)=\"triggerMobileRowAction(action.actionKey)\"\r\n        >\r\n          <i [class]=\"getActionIcon(action, mobileRowActionTarget) || 'ri-arrow-right-line'\" aria-hidden=\"true\"></i>\r\n          <span>{{ getActionLabel(action, mobileRowActionTarget) }}</span>\r\n        </button>\r\n      }\r\n    </div>\r\n  }\r\n</gom-lib-modal>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{display:block}.gom-table-shell{display:grid;gap:0;width:100%;padding:0;background:#fff;border:.125rem solid #e9e9e9;border-radius:.75rem;box-shadow:0 1px 3px #0000000f,0 1px 2px #0000000a}.gom-table-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem;padding:1.5rem 1.5rem 1rem;border-bottom:.0625rem solid #e9e9e9}.gom-table-toolbar__search{position:relative;flex:1;min-width:0}.gom-table-toolbar__actions{position:relative;display:inline-flex;align-items:flex-end;gap:.5rem;margin-left:auto}.gom-table-options-button__label{margin-left:.25rem}.gom-table-mobile-toggle{display:none;align-items:center}.gom-table-search{display:block;min-width:14rem;max-width:28rem}.gom-table-quick-filter{display:flex;align-items:flex-end;min-width:9rem;max-width:14rem}.gom-table-quick-filter>*{width:100%}.gom-table-filter-button{display:inline-flex;white-space:nowrap}.gom-table-filter-button i{margin-right:.25rem}.gom-table-options{position:relative;display:inline-flex}.gom-table-options__menu{position:absolute;top:calc(100% + .5rem);right:0;z-index:20;display:grid;gap:.25rem;min-width:13rem;padding:.5rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024}.gom-table-options__item{justify-content:flex-start;text-align:left}.gom-table-options__item i{margin-right:.5rem}.gom-table-icon-button{display:inline-flex;align-items:center;justify-content:center}.gom-table-icon-button i{font-size:1.25rem;color:currentColor}.gom-table-filter-navigation{display:grid;min-width:0;border-bottom:.0625rem solid #e9e9e9;background:#fff}.gom-table-filter-navigation__row{display:flex;align-items:center;gap:.75rem;min-width:0;padding:.5rem 1.5rem}.gom-table-filter-navigation__row+.gom-table-filter-navigation__row{border-top:.0625rem solid #e9e9e9}.gom-table-filter-navigation__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;flex:0 0 auto;min-width:5rem;color:#58595b}.gom-table-filter-navigation__options{display:flex;flex:1 1 auto;align-items:center;gap:.5rem;min-width:0}.gom-table-filter-navigation__option{flex:0 0 auto;white-space:nowrap}.gom-table-filter-navigation__option-label{display:inline-block}.gom-table-filter-navigation__count{display:inline-flex;align-items:center;justify-content:center;min-width:1.375rem;min-height:1.375rem;margin-inline-start:.5rem;padding:0 .25rem;border:.125rem solid #d8d8d8;border-radius:999px;background:#fff;color:#58595b;font-size:.75rem;font-weight:600;line-height:1}.gom-table-filter-navigation__option--selected .gom-table-filter-navigation__count{border-color:transparent;background:#fff;color:#0a5d8b}.gom-table-filter-navigation__more{position:relative;flex:0 0 auto;margin-left:auto}.gom-table-filter-navigation__menu{position:absolute;top:calc(100% + .25rem);right:0;z-index:30;display:grid;gap:.25rem;min-width:12rem;max-height:18rem;padding:.5rem;overflow-y:auto;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024}.gom-table-filter-navigation__menu-item{display:block;width:100%}.gom-table-bulk-actions{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 1.5rem;border-bottom:.0625rem solid #e9e9e9;background:#e6f7ff}.gom-table-bulk-actions__summary,.gom-table-bulk-actions__controls{display:flex;align-items:center;gap:.5rem}.gom-table-bulk-actions__summary{color:#0a5d8b}.gom-table-bulk-actions__summary i{font-size:1.125rem}.gom-table-bulk-actions__controls{flex-wrap:wrap;justify-content:flex-end}.gom-table-bulk-actions__controls i{margin-right:.25rem}.gom-table-bulk-actions__clear i{margin-right:0}.gom-table-inline-edit-banner{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 1.5rem;border-bottom:.0625rem solid #f5c242;background:#fffbeb}.gom-table-inline-edit-banner__summary,.gom-table-inline-edit-banner__actions{display:flex;align-items:center;gap:.5rem}.gom-table-inline-edit-banner__summary{color:#212121}.gom-table-inline-edit-banner__summary strong{font-weight:700}.gom-table-inline-edit-banner__summary span:last-child{color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:400;line-height:1.2}.gom-table-inline-edit-banner__count{display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:50%;background:#f59e0b;color:#1f2937;font-size:.6875rem;font-weight:700}.gom-table-inline-edit-banner__actions{flex-wrap:wrap;justify-content:flex-end}@media(max-width:48rem){.gom-table-bulk-actions{align-items:stretch;flex-direction:column}.gom-table-bulk-actions__controls{justify-content:flex-start}.gom-table-inline-edit-banner,.gom-table-inline-edit-banner__summary{align-items:flex-start;flex-direction:column}.gom-table-inline-edit-banner__actions{width:100%;justify-content:flex-start}}.gom-table-panel{position:absolute;top:calc(100% + .5rem);right:0;width:min(18rem,85vw);border:.125rem solid #d8d8d8;border-radius:.75rem;background:#fff;box-shadow:0 .5rem 1.5rem #00000024;z-index:10;overflow:hidden}.gom-table-panel__header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem;border-bottom:.125rem solid #d8d8d8}.gom-table-panel__header h3{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-table-panel__close{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;border:0;background:transparent;color:#0a5d8b;padding:0}.gom-table-panel__body{display:grid;gap:.5rem;padding:1rem;max-height:18rem;overflow:auto}.gom-table-wrap{overflow:auto;max-height:var(--gom-table-body-max-height, none);background:#fff;scrollbar-width:thin;scrollbar-color:#767676 #f6f6f6}.gom-table-wrap::-webkit-scrollbar{height:.625rem;width:.625rem}.gom-table-wrap::-webkit-scrollbar-track{background:#f6f6f6;border-radius:999px}.gom-table-wrap::-webkit-scrollbar-thumb{background:#767676;border-radius:999px;border:2px solid #f6f6f6}.gom-table-wrap::-webkit-scrollbar-thumb:hover{background:#0a5d8b}.gom-table-wrap::-webkit-scrollbar-button{display:none;width:0;height:0}.gom-card-list,.gom-table-applied-filters,.gom-table-mobile-result-bar,.gom-table-mobile-pagination{display:none}.gom-card-item{transition:box-shadow .14s ease,transform .14s ease}.gom-card-item--clickable{cursor:pointer}.gom-card-item--clickable:hover,.gom-card-item--clickable:focus-within{box-shadow:0 .25rem .75rem #0f172a1a;transform:translateY(-1px)}.gom-card__selection{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:.0625rem solid #d8d8d8;color:#0a5d8b}.gom-card__row{display:grid;gap:.25rem;padding-bottom:.25rem}.gom-card__row:not(:last-child){margin-bottom:.25rem}.gom-card__label{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;margin:0;color:#0a5d8b}.gom-card__value{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;margin:0;color:#212121}.gom-card__actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.5rem;padding-top:.5rem;border-top:.0625rem solid #d8d8d8}.gom-card__state{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;margin:0;color:#58595b;text-align:center;padding:1rem 0}.gom-card-item--skeleton{pointer-events:none}.gom-card-item--skeleton .gom-card__skeleton-line{display:block;margin-bottom:.5rem}.gom-card-item--skeleton .gom-card__skeleton-line--title{width:44%;height:.9rem}.gom-card-item--skeleton .gom-card__skeleton-line--wide{width:88%;margin-bottom:0}.gom-table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;padding:1rem;border-bottom:.0625rem solid #e9e9e9}th{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;position:sticky;top:0;z-index:1;background:#f6f6f6;color:#0a5d8b;-webkit-user-select:none;user-select:none;text-transform:uppercase;letter-spacing:.03em;font-size:.7rem;font-weight:600}.gom-table-filter-row th{padding-top:.25rem;padding-bottom:.5rem;background:#94a3b814}.gom-table-column-filter{width:100%;min-width:0}.gom-table-filter-spacer{display:block;min-height:2rem}th.sortable{cursor:pointer}th.sortable:hover{background:#94a3b81f}.sort-indicator{margin-left:.25rem;display:inline-flex;align-items:center;justify-content:center;min-width:1rem;color:#074161}.sort-indicator i{font-size:1rem}.align-left{text-align:left}.align-center{text-align:center}.align-right{text-align:right}.text-truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.text-wrap{white-space:normal;overflow-wrap:anywhere}.text-expand{white-space:pre-wrap}.gom-table-selection-col{width:2.5rem;min-width:2.5rem;text-align:center}.gom-table-selection-col input[type=checkbox]{margin:0;cursor:pointer}.state-cell{text-align:center;color:#9e9e9e;padding:1.5rem}.gom-table-skeleton-row:hover{background:transparent}.gom-table-skeleton-cell{vertical-align:middle}.gom-table-skeleton-line,.gom-table-skeleton-box,.gom-card__skeleton-line{display:inline-block;width:100%;height:.75rem;border-radius:999px;background:linear-gradient(90deg,#94a3b829,#94a3b852 45%,#94a3b829);background-size:200% 100%;animation:gom-skeleton-shimmer 1.2s ease-in-out infinite}.gom-table-skeleton-box{width:1rem;height:1rem;border-radius:.25rem}.gom-table-skeleton-cell:nth-child(3n) .gom-table-skeleton-line{width:72%}.gom-table-skeleton-cell:nth-child(4n) .gom-table-skeleton-line{width:56%}.gom-table-skeleton-cell:nth-child(5n) .gom-table-skeleton-line{width:84%}tbody tr{transition:background-color .12s ease}tbody tr:hover{background:#2563eb0a}@keyframes gom-skeleton-shimmer{0%{background-position:100% 0}to{background-position:-100% 0}}.gom-table-actions{display:inline-flex;flex-wrap:nowrap;gap:.5rem}.gom-table-action-menu,.gom-table-action-overflow{position:relative;display:inline-flex}.gom-table-submenu{position:fixed;z-index:9999;min-width:12rem;display:flex;flex-direction:column;gap:.25rem;padding:.5rem;border:.125rem solid #d8d8d8;border-radius:.5rem;background:#fff;box-shadow:0 .5rem 1rem #00000029}.gom-table-submenu__item{justify-content:flex-start;text-align:left}.gom-table-actions__button{flex:0 0 auto}.gom-table-cell--actions{white-space:nowrap;overflow:visible}.gom-table-cell-action{appearance:none;border:0;background:transparent;padding:0;margin:0;display:inline-flex;align-items:center;gap:.35rem;color:inherit;font:inherit;cursor:pointer;text-decoration:none}.gom-table-cell-action__icon{font-size:.95rem;color:#074161}.gom-table-cell-action--chip{text-decoration:none}.gom-table-cell-action:hover{color:#074161}.gom-table-cell-action--chip:hover{color:inherit}.gom-table-cell--editable{overflow:visible}.gom-table-cell--editing{padding-top:.5rem;padding-bottom:.5rem}.gom-table-cell-editor{display:block;width:100%;min-width:0;text-align:left}.gom-table-cell-edit-trigger{width:100%;appearance:none;border:.0625rem solid transparent;border-radius:.25rem;background:transparent;padding:.25rem;color:inherit;font:inherit;text-align:inherit;cursor:text}.gom-table-cell-edit-trigger:hover,.gom-table-cell-edit-trigger:focus-visible{border-color:#d8d8d8;outline:none;background:#f6f6f6}.gom-table-header--actions,.gom-table-cell--actions{min-width:11.5rem}.gom-table-footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem 1.5rem}.gom-table-footer__summary{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#58595b}.gom-table-footer__summary strong{color:#212121;font-weight:600}.gom-table-page-size-select{min-width:6.25rem}.gom-table-pagination,.gom-table-pagination__pages{display:inline-flex;align-items:center;gap:.25rem}.gom-table-pagination__ellipsis{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;display:inline-flex;align-items:center;justify-content:center;min-width:1.5rem;color:#58595b}.gom-table-pager-button,.gom-table-page-button{display:inline-flex;align-items:center;justify-content:center;min-width:2rem;min-height:2rem;border-radius:.5rem;transition:all .12s ease}.gom-table-pager-button i,.gom-table-page-button i{font-size:1.25rem;color:currentColor}.gom-table-pager-button:not([disabled]):hover,.gom-table-page-button:not([disabled]):hover{transform:translateY(-1px)}.gom-table-page-button{min-width:2rem}@media(max-width:48rem){.gom-table-footer{align-items:flex-start;flex-direction:column}.gom-table-pagination{width:100%}.gom-table-page-size-select{margin-left:auto}}@media(max-width:32rem){.gom-table-pagination__pages{display:none}}.checkbox-row{display:inline-flex;align-items:center;gap:.5rem}.gom-table-advanced-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.gom-table-advanced-filters__empty{grid-column:1/-1;margin:0;color:#58595b}.gom-table-date-range{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;min-width:0;margin:0;padding:1rem;border:.125rem solid #d8d8d8;border-radius:.5rem}.gom-table-date-range legend{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;padding:0 .25rem;color:#0a5d8b}.gom-table-filter-actions{display:flex;align-items:center;justify-content:space-between;width:100%;gap:.75rem}.gom-table-filter-actions__end{display:flex;align-items:center;gap:.5rem}@media(max-width:48rem){:host(.gom-table-mobile-card){--gom-mobile-table-blue: #074161;display:block}:host(.gom-table-mobile-card) .gom-table-shell{gap:0}.gom-table-toolbar{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:.5rem;padding:1rem 1rem .5rem}.gom-table-toolbar__search{grid-column:1/-1;min-width:0}.gom-table-toolbar__actions{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;flex-wrap:nowrap;gap:.25rem;margin-left:0;width:100%}.gom-table-toolbar__actions>.gom-table-filter-button{flex:0 0 auto}.gom-table-toolbar__actions>.gom-table-options{min-width:0;width:100%}.gom-table-toolbar__actions .gom-table-mobile-toggle{margin-left:0;justify-self:end}.gom-table-toolbar__actions .gom-table-options{margin-left:0}.gom-table-quick-filter,.gom-table-clear-filters{display:none}.gom-table-mobile-toggle{display:inline-flex;align-items:center;gap:.125rem;margin:0;padding:.125rem .2rem;border:.125rem solid #e9e9e9;border-radius:.5rem;background:#f6f6f6}.gom-table-mobile-toggle legend{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.gom-table-mobile-toggle>gom-lib-button ::ng-deep .gom-button{min-width:1.9rem;min-height:1.9rem;border:0;padding:.22rem;border-radius:.5rem;background:transparent;color:#58595b}.gom-table-mobile-toggle>gom-lib-button ::ng-deep .gom-button:not(.gom-button--ghost):not(.gom-button--secondary):not(.gom-button--danger){background:#074161;color:#fff}.gom-table-filter-button .gom-table-filter-button__label{display:inline;font-size:.88rem;font-weight:600}.gom-table-filter-button i{margin-right:.25rem;font-size:.95rem}.gom-table-filter-button ::ng-deep .gom-button{min-height:2.05rem;border:.125rem solid #e9e9e9;border-radius:.55rem;background:#fff;color:#212121;padding-inline:.68rem;box-shadow:none}.gom-table-filter-button ::ng-deep .gom-button:not(.gom-button--secondary):not(.gom-button--danger):not(.gom-button--ghost){border-color:#0a5d8b;background:#e6f7ff;color:#074161}.gom-table-options-button{width:100%}.gom-table-options-button .gom-table-options-button__label{display:inline-block;margin-left:.25rem;font-size:.88rem;font-weight:600;min-width:0;max-width:8.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gom-table-options-button i{margin-right:.25rem;font-size:.95rem}.gom-table-options-button ::ng-deep .gom-button{min-height:2.05rem;border:.125rem solid #e9e9e9;border-radius:.55rem;background:#fff;color:#212121;padding-inline:.68rem;box-shadow:none;width:100%;min-width:0;justify-content:flex-start}.gom-table-search{min-width:0;max-width:100%}.gom-table-search ::ng-deep .gom-input{border-color:#e9e9e9;border-radius:.6rem;min-height:2.2rem;box-shadow:none}.gom-table-applied-filters{display:grid;gap:.25rem;padding:.5rem 0;margin-left:1.2rem}.gom-table-applied-filters__chips{display:flex;align-items:center;gap:.25rem;overflow-x:auto;scrollbar-width:none}.gom-table-applied-filter,.gom-table-applied-filters__clear{flex:0 0 auto;border:1px solid var(--gom-mobile-table-blue);border-radius:.25rem;padding:.2rem .45rem;background:#eff6ff;color:var(--gom-mobile-table-blue);font:inherit;font-size:.72rem;font-weight:600}.gom-table-applied-filters__clear{border-color:transparent;background:transparent}.gom-table-applied-filters__summary{display:none}.gom-table-filter-navigation__row{display:block;padding:.5rem 0}.gom-table-filter-navigation__label{display:none}.gom-table-filter-navigation__options{gap:.25rem;overflow-x:auto;padding:0 .5rem;scrollbar-width:none}.gom-table-filter-navigation__options::-webkit-scrollbar{display:none}.gom-table-filter-navigation__row+.gom-table-filter-navigation__row{display:none}.gom-table-mobile-result-bar{display:flex;align-items:center;flex-wrap:wrap;gap:.25rem;padding:.45rem .5rem;border-bottom:.125rem solid #d8d8d8;background:#fff;color:#58595b;font-size:.82rem}.gom-table-mobile-result-bar strong{color:var(--gom-mobile-table-blue);font-weight:700}.gom-table-advanced-filters,.gom-table-date-range{grid-template-columns:1fr}.gom-table-filter-actions{align-items:stretch;flex-direction:column}.gom-table-filter-actions__end{justify-content:flex-end}:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-table-wrap,:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-table-footer{display:none}:host(.gom-table-mobile-card).gom-table-mobile-cards-active .gom-card-list{display:grid;gap:.75rem;padding:1rem 0}.gom-card-item{border:.125rem solid #d8d8d8;border-radius:.75rem;padding:.75rem 1rem;box-shadow:0 .125rem .375rem #0f172a14}.gom-card-item--selected{border:2px solid var(--gom-mobile-table-blue)}.gom-card__config{display:grid;gap:.75rem}.gom-card__header{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:start;gap:.5rem;min-height:1.75rem}.gom-card__checkbox input{display:block;width:1rem;height:1rem;margin:0;accent-color:var(--gom-mobile-table-blue)}.gom-card__primary{overflow:hidden;color:var(--gom-mobile-table-blue);text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;font-weight:700}.gom-card__header time{color:#58595b;font-size:.75rem}.gom-card__menu-trigger{width:1.5rem;min-width:1.5rem;min-height:1.5rem}.gom-card__menu-trigger i{font-size:1.1rem}.gom-card__identity{display:flex;align-items:center;gap:.5rem;margin:.5rem 0;padding-left:.5rem}.gom-card__identity div{display:grid;min-width:0}.gom-card__identity strong{font-size:.8rem;line-height:1.25}.gom-card__identity small{color:#58595b;font-size:.7rem;line-height:1.25}.gom-card__identity--stacked{align-items:flex-start;margin:0;padding-left:0}.gom-card__subtitle{display:flex;flex-wrap:wrap;align-items:center;gap:.2rem;margin-top:.15rem;color:#58595b;font-size:.7rem;line-height:1.2}.gom-card__subtitle-separator{color:#58595b}.gom-card__status-chip{align-self:start}.gom-card__overflow{position:relative;display:inline-flex;align-items:flex-start;justify-content:flex-end}.gom-card__body{display:grid;gap:.5rem}.gom-card__body--hidden{display:none}.gom-card__field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem .75rem;padding-top:.75rem;border-top:.0625rem solid #e9e9e9}.gom-card__field-grid--expanded{padding-top:0;border-top:0}.gom-card__field{display:grid;gap:.2rem;min-width:0}.gom-card__field--full{grid-column:1/-1}.gom-card__config .gom-card__label{color:#58595b;font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.gom-card__config .gom-card__value{overflow-wrap:anywhere;color:#212121;font-size:.82rem;font-weight:600}.gom-card__details-toggle{border:0;padding:.1rem 0;background:transparent;color:var(--gom-mobile-table-blue);font:inherit;font-size:.78rem;font-weight:700;line-height:1.3;text-align:center}.gom-card__footer{display:flex;flex-wrap:nowrap;align-items:center;justify-content:flex-end;gap:.25rem;padding-top:.6rem;border-top:.0625rem solid #e9e9e9;overflow-x:auto;scrollbar-width:none}.gom-card__footer::-webkit-scrollbar{display:none}.gom-card__footer-action{flex:0 0 auto;width:auto;justify-content:flex-start;min-width:0}.gom-card__footer-action i{margin-right:.3rem}.gom-card__footer-action span{white-space:nowrap}.gom-card__footer-action--icon-only{flex:0 0 2rem;width:2rem;min-width:2rem;max-width:2rem;display:inline-flex;justify-content:center}.gom-card__footer-action--icon-only ::ng-deep .gom-button{padding:0}.gom-card__footer-action--icon-only i{margin-right:0}.gom-card__footer--icon-only{gap:.125rem}.gom-card__avatar{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:50%;background:#eff6ff;color:var(--gom-mobile-table-blue);font-size:.68rem;font-weight:700}.gom-card__summary-row,.gom-card__metadata{display:flex;align-items:center;gap:.5rem}.gom-card__summary-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);column-gap:1rem;align-items:center;padding:.45rem 0 .55rem;font-size:.78rem}.gom-card__summary-row>span:first-child{justify-self:start}.gom-card__summary-row>strong{justify-self:center}.gom-card__source{justify-self:end;border-radius:.25rem;padding:.12rem .45rem;background:#f6f6f6;font-size:.66rem}.gom-card__metadata{min-height:2rem;padding-top:.5rem;border-top:.0625rem solid #d8d8d8;color:#58595b;font-size:.72rem}.gom-table-mobile-pagination{display:flex;justify-content:center;padding:1rem 0}.gom-table-mobile-pagination .gom-table-pagination{justify-content:center;width:100%}.gom-table-mobile-load-more{width:100%}.gom-table-mobile-load-more-sentinel{display:block;width:100%;height:1px}.gom-table-bulk-actions{display:contents}.gom-table-bulk-actions__summary{position:sticky;top:0;z-index:12;justify-content:space-between;padding:1rem;background:var(--gom-mobile-table-blue);color:#fff}.gom-table-bulk-actions__controls{position:fixed;right:0;bottom:0;left:0;z-index:900;flex-wrap:nowrap;padding:1rem;border-top:.125rem solid #d8d8d8;background:#fff;box-shadow:0 -.25rem .75rem #0f172a14}.gom-table-bulk-actions__controls>*{flex:1 1 auto}.gom-table-mobile-filter-group{margin:0;padding:0 0 1.5rem;border:0;border-bottom:.125rem solid #d8d8d8}.gom-table-mobile-filter-group legend{margin-bottom:1rem;color:#58595b;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.gom-table-mobile-filter-options{display:grid;gap:.75rem}.gom-table-mobile-filter-option{display:flex;align-items:center;gap:.5rem;min-height:1.9rem;color:#212121}.gom-table-mobile-filter-option input{width:1.15rem;height:1.15rem;accent-color:var(--gom-mobile-table-blue)}.gom-table-mobile-filter-option span{flex:1}.gom-table-mobile-filter-option small{color:#9e9e9e}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-options{display:flex;flex-wrap:wrap;gap:.5rem}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option{min-height:auto;border:.125rem solid #d8d8d8;border-radius:999px;padding:.45rem .8rem}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option input{position:absolute;opacity:0;pointer-events:none}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option span{flex:initial}.gom-table-mobile-filter-group--chips .gom-table-mobile-filter-option--selected{border-color:var(--gom-mobile-table-blue);color:var(--gom-mobile-table-blue);font-weight:600}.gom-table-filter-actions__summary{display:block;text-align:center;color:#58595b;font-size:.78rem}.gom-table-filter-actions__end,.gom-table-filter-actions__apply{width:100%}.gom-table-filter-actions__end>gom-lib-button:first-child{display:none}.gom-table-mobile-sheet-list{display:grid;margin:0 -1rem}.gom-table-mobile-sheet-list button{display:grid;grid-template-columns:1.5rem minmax(0,1fr) auto auto;align-items:center;gap:.5rem;min-height:3rem;border:0;border-bottom:.0625rem solid #d8d8d8;padding:0 1rem;background:transparent;color:#212121;font:inherit;text-align:left}.gom-table-mobile-sheet-list button small{color:#9e9e9e}.gom-table-mobile-sheet-list button:disabled{opacity:.45}.gom-table-mobile-sheet-list__danger{color:#eb0a1e!important}.gom-table-mobile-columns{display:grid;gap:.5rem}.gom-table-mobile-columns>p{margin:0;color:#58595b;font-size:.78rem}.gom-table-mobile-columns__list{display:grid;max-height:60dvh;margin:0 -1rem;overflow-y:auto}.gom-table-mobile-columns__option{display:flex;align-items:center;gap:.5rem;min-height:3rem;padding:0 1rem;border-bottom:.0625rem solid #d8d8d8;color:#212121;cursor:pointer}.gom-table-mobile-columns__option input{width:1.1rem;height:1.1rem;margin:0;accent-color:var(--gom-mobile-table-blue)}.gom-table-mobile-columns__option:has(input:disabled){color:#767676;cursor:not-allowed}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-card-list{display:none}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-footer{display:none}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table{width:max-content;min-width:42rem;table-layout:auto}:host(.gom-table-mobile-card).gom-table-mobile-table-active th,:host(.gom-table-mobile-card).gom-table-mobile-table-active td{min-width:8rem;white-space:nowrap}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-filter-row th{position:sticky;top:2.25rem;z-index:2;min-height:2.75rem;background:#fff}:host(.gom-table-mobile-card).gom-table-mobile-table-active .gom-table-column-filter{display:block;min-width:7rem}:host(.gom-table-mobile-card).gom-table-mobile-table-active th:last-child,:host(.gom-table-mobile-card).gom-table-mobile-table-active td:last-child{min-width:4.5rem}}\n"] }]
        }], propDecorators: { columns: [{
                type: Input
            }], rows: [{
                type: Input
            }], loading: [{
                type: Input
            }], dataMode: [{
                type: Input
            }], totalItems: [{
                type: Input
            }], pageSize: [{
                type: Input
            }], pageIndex: [{
                type: Input
            }], pageSizeOptions: [{
                type: Input
            }], showPagination: [{
                type: Input
            }], searchPlaceholder: [{
                type: Input
            }], emptyMessage: [{
                type: Input
            }], mobileCardView: [{
                type: Input
            }], mobileCardFields: [{
                type: Input
            }], mobileSortKeys: [{
                type: Input
            }], mobileCardClickable: [{
                type: Input
            }], mobileCardConfig: [{
                type: Input
            }], mobilePaginationMode: [{
                type: Input
            }], mobileAutoLoadMore: [{
                type: Input
            }], mobileLoadMoreStrategy: [{
                type: Input
            }], bodyViewportRows: [{
                type: Input
            }], enableRowSelection: [{
                type: Input
            }], bulkActions: [{
                type: Input
            }], bulkActionBusyKey: [{
                type: Input
            }], selectionItemLabel: [{
                type: Input
            }], showSearch: [{
                type: Input
            }], globalSearchScope: [{
                type: Input
            }], searchDebounceMs: [{
                type: Input
            }], showFilterButton: [{
                type: Input
            }], showClearFilterButton: [{
                type: Input
            }], advancedFilterDefinitions: [{
                type: Input
            }], filterNavigationRows: [{
                type: Input
            }], enableColumnSearch: [{
                type: Input
            }], showColumnSearchInitially: [{
                type: Input
            }], enableColumnVisibility: [{
                type: Input
            }], showExport: [{
                type: Input
            }], showInlineEditBanner: [{
                type: Input
            }], inlineEditBannerCount: [{
                type: Input
            }], inlineEditBannerSummary: [{
                type: Input
            }], inlineEditBannerDetail: [{
                type: Input
            }], inlineEditBannerSaveLabel: [{
                type: Input
            }], inlineEditBannerDiscardLabel: [{
                type: Input
            }], inlineEditBannerReviewLabel: [{
                type: Input
            }], inlineEditBannerSaving: [{
                type: Input
            }], queryChange: [{
                type: Output
            }], pageChange: [{
                type: Output
            }], sortChange: [{
                type: Output
            }], filterChange: [{
                type: Output
            }], filterNavigationChange: [{
                type: Output
            }], columnVisibilityChange: [{
                type: Output
            }], rowAction: [{
                type: Output
            }], cellEdit: [{
                type: Output
            }], rowClick: [{
                type: Output
            }], selectedRowsChange: [{
                type: Output
            }], bulkAction: [{
                type: Output
            }], loadMore: [{
                type: Output
            }], exportClick: [{
                type: Output
            }], inlineEditDiscardAll: [{
                type: Output
            }], inlineEditSaveAll: [{
                type: Output
            }], inlineEditReviewChanges: [{
                type: Output
            }], tableBodyMaxHeight: [{
                type: HostBinding,
                args: ['style.--gom-table-body-max-height']
            }], mobileLoadMoreSentinel: [{
                type: ViewChild,
                args: ['mobileLoadMoreSentinel']
            }], onResize: [{
                type: HostListener,
                args: ['window:resize']
            }], onDocumentClick: [{
                type: HostListener,
                args: ['document:click', ['$event']]
            }], onDocumentKeydown: [{
                type: HostListener,
                args: ['document:keydown', ['$event']]
            }] } });

/**
 * Theme Service for GOM-UI
 * Manages theme switching and CSS variable updates at runtime
 */
class ThemeService {
    constructor() {
        this.themeMode = signal('light', ...(ngDevMode ? [{ debugName: "themeMode" }] : []));
        this.themeMode$ = this.themeMode.asReadonly();
        this.initializeTheme();
    }
    /**
     * Initialize theme based on system preference or localStorage
     */
    initializeTheme() {
        const savedTheme = this.getSavedTheme();
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
        else {
            this.detectSystemTheme();
        }
    }
    /**
     * Detect system theme preference
     */
    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.setTheme('dark');
        }
        else {
            this.setTheme('light');
        }
    }
    /**
     * Get saved theme from localStorage
     */
    getSavedTheme() {
        const saved = localStorage.getItem('gom-ui-theme');
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
            return saved;
        }
        return null;
    }
    /**
     * Set theme and persist to localStorage
     */
    setTheme(theme) {
        this.themeMode.set(theme);
        localStorage.setItem('gom-ui-theme', theme);
        // Update document class
        document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        document.documentElement.classList.add(`theme-${theme}`);
        // Update color scheme meta tag
        if (theme === 'dark') {
            document.documentElement.style.colorScheme = 'dark';
        }
        else if (theme === 'light') {
            document.documentElement.style.colorScheme = 'light';
        }
        else {
            document.documentElement.style.colorScheme = 'light dark';
        }
    }
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const current = this.themeMode();
        const next = current === 'light' ? 'dark' : 'light';
        this.setTheme(next);
    }
    /**
     * Get current theme
     */
    getTheme() {
        return this.themeMode();
    }
    /**
     * Set CSS variable at runtime
     * @param variable - CSS variable name (without --)
     * @param value - CSS variable value
     */
    setCSSVariable(variable, value) {
        document.documentElement.style.setProperty(`--${variable}`, value);
    }
    /**
     * Get CSS variable value
     * @param variable - CSS variable name (without --)
     */
    getCSSVariable(variable) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${variable}`).trim();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemeService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemeService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemeService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [] });

/**
 * Theming Module for GOM-UI
 * Provides theme configuration and theming utilities
 *
 * Usage:
 *   1. Import in app.config.ts: importProvidersFrom(ThemedModule)
 *   2. Import styles in global styles: @use './app/shared/theming/styles/theme';
 *   3. Inject ThemeService in components for dynamic theme switching
 */
class ThemedModule {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemedModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.19", ngImport: i0, type: ThemedModule }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemedModule, providers: [ThemeService] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: ThemedModule, decorators: [{
            type: NgModule,
            args: [{
                    providers: [ThemeService],
                }]
        }] });

/**
 * Shared Module - GOM-UI
 * Central export for all shared functionality including theming and components
 *
 * Usage in your app:
 *   import { SharedModule } from '@gom/ui';
 *
 *   @NgModule({
 *     imports: [SharedModule],
 *   })
 *   export class MyFeatureModule {}
 */
class SharedModule {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: SharedModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.3.19", ngImport: i0, type: SharedModule, imports: [CommonModule,
            FormControlsModule,
            GomTableComponent,
            ThemedModule], exports: [CommonModule,
            FormControlsModule,
            GomTableComponent,
            ThemedModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: SharedModule, imports: [CommonModule,
            FormControlsModule,
            GomTableComponent,
            ThemedModule, CommonModule,
            FormControlsModule,
            ThemedModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: SharedModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        CommonModule,
                        FormControlsModule,
                        GomTableComponent,
                        ThemedModule,
                    ],
                    exports: [
                        CommonModule,
                        FormControlsModule,
                        GomTableComponent,
                        ThemedModule,
                    ],
                }]
        }] });

class GomTabsComponent {
    constructor() {
        /**
         * Array of tab items to display
         */
        this.tabs = input([], ...(ngDevMode ? [{ debugName: "tabs" }] : []));
        /**
         * The currently active tab ID
         */
        this.activeTab = input(...(ngDevMode ? [undefined, { debugName: "activeTab" }] : []));
        /**
         * Emits when a tab is clicked
         */
        this.tabChange = output();
        /**
         * Get available tabs (non-disabled)
         */
        this.availableTabs = computed(() => {
            return this.tabs().filter(tab => !tab.disabled);
        }, ...(ngDevMode ? [{ debugName: "availableTabs" }] : []));
    }
    /**
     * Handle tab click
     */
    selectTab(tabId) {
        this.tabChange.emit(tabId);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTabsComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomTabsComponent, isStandalone: true, selector: "gom-lib-tabs", inputs: { tabs: { classPropertyName: "tabs", publicName: "tabs", isSignal: true, isRequired: false, transformFunction: null }, activeTab: { classPropertyName: "activeTab", publicName: "activeTab", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { tabChange: "tabChange" }, host: { classAttribute: "gom-tabs" }, ngImport: i0, template: "<nav class=\"gom-tabs__nav\">\r\n  @for (tab of tabs(); track tab.id) {\r\n    <button\r\n      type=\"button\"\r\n      class=\"gom-tabs__button\"\r\n      [class.active]=\"tab.id === activeTab()\"\r\n      [disabled]=\"tab.disabled\"\r\n      (click)=\"selectTab(tab.id)\"\r\n    >\r\n      {{ tab.label | translate }}\r\n    </button>\r\n  }\r\n</nav>\r\n\r\n<div class=\"gom-tabs__content\">\r\n  <ng-content></ng-content>\r\n</div>\r\n", styles: [".gom-tabs{display:flex;flex-direction:column;gap:1.5rem}.gom-tabs__nav{display:flex;gap:.5rem;border-bottom:1px solid #e0e0e0;overflow-x:auto;-webkit-overflow-scrolling:touch}.gom-tabs__nav::-webkit-scrollbar{height:4px}.gom-tabs__nav::-webkit-scrollbar-track{background:transparent}.gom-tabs__nav::-webkit-scrollbar-thumb{background:#bdbdbd;border-radius:2px}.gom-tabs__nav::-webkit-scrollbar-thumb:hover{background:#9e9e9e}.gom-tabs__button{padding:.75rem 1.5rem;min-width:max-content;font-size:.875rem;font-weight:500;color:#666;background:none;border:none;border-bottom:3px solid transparent;cursor:pointer;transition:all .2s ease;white-space:nowrap}.gom-tabs__button:hover:not(:disabled){color:#333;background-color:#f5f5f5}.gom-tabs__button.active{color:#1976d2;border-bottom-color:#1976d2}.gom-tabs__button:disabled{color:#bdbdbd;cursor:not-allowed;opacity:.5}.gom-tabs__button:focus-visible{outline:2px solid #1976d2;outline-offset:-2px}.gom-tabs__content{animation:fadeIn .2s ease}@keyframes fadeIn{0%{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}@media(max-width:600px){.gom-tabs{gap:1rem}.gom-tabs__nav{gap:.25rem}.gom-tabs__button{padding:.625rem 1rem;font-size:.8125rem}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "ngmodule", type: TranslateModule }, { kind: "pipe", type: i1$2.TranslatePipe, name: "translate" }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTabsComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-tabs', standalone: true, imports: [CommonModule, TranslateModule], changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        class: 'gom-tabs',
                    }, template: "<nav class=\"gom-tabs__nav\">\r\n  @for (tab of tabs(); track tab.id) {\r\n    <button\r\n      type=\"button\"\r\n      class=\"gom-tabs__button\"\r\n      [class.active]=\"tab.id === activeTab()\"\r\n      [disabled]=\"tab.disabled\"\r\n      (click)=\"selectTab(tab.id)\"\r\n    >\r\n      {{ tab.label | translate }}\r\n    </button>\r\n  }\r\n</nav>\r\n\r\n<div class=\"gom-tabs__content\">\r\n  <ng-content></ng-content>\r\n</div>\r\n", styles: [".gom-tabs{display:flex;flex-direction:column;gap:1.5rem}.gom-tabs__nav{display:flex;gap:.5rem;border-bottom:1px solid #e0e0e0;overflow-x:auto;-webkit-overflow-scrolling:touch}.gom-tabs__nav::-webkit-scrollbar{height:4px}.gom-tabs__nav::-webkit-scrollbar-track{background:transparent}.gom-tabs__nav::-webkit-scrollbar-thumb{background:#bdbdbd;border-radius:2px}.gom-tabs__nav::-webkit-scrollbar-thumb:hover{background:#9e9e9e}.gom-tabs__button{padding:.75rem 1.5rem;min-width:max-content;font-size:.875rem;font-weight:500;color:#666;background:none;border:none;border-bottom:3px solid transparent;cursor:pointer;transition:all .2s ease;white-space:nowrap}.gom-tabs__button:hover:not(:disabled){color:#333;background-color:#f5f5f5}.gom-tabs__button.active{color:#1976d2;border-bottom-color:#1976d2}.gom-tabs__button:disabled{color:#bdbdbd;cursor:not-allowed;opacity:.5}.gom-tabs__button:focus-visible{outline:2px solid #1976d2;outline-offset:-2px}.gom-tabs__content{animation:fadeIn .2s ease}@keyframes fadeIn{0%{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}@media(max-width:600px){.gom-tabs{gap:1rem}.gom-tabs__nav{gap:.25rem}.gom-tabs__button{padding:.625rem 1rem;font-size:.8125rem}}\n"] }]
        }], propDecorators: { tabs: [{ type: i0.Input, args: [{ isSignal: true, alias: "tabs", required: false }] }], activeTab: [{ type: i0.Input, args: [{ isSignal: true, alias: "activeTab", required: false }] }], tabChange: [{ type: i0.Output, args: ["tabChange"] }] } });

class GomTabContentComponent {
    constructor() {
        /**
         * The tab ID this content belongs to
         */
        this.tabId = input(...(ngDevMode ? [undefined, { debugName: "tabId" }] : []));
        /**
         * The currently active tab ID
         */
        this.activeTab = input(...(ngDevMode ? [undefined, { debugName: "activeTab" }] : []));
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTabContentComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "20.3.19", type: GomTabContentComponent, isStandalone: true, selector: "gom-lib-tab-content", inputs: { tabId: { classPropertyName: "tabId", publicName: "tabId", isSignal: true, isRequired: false, transformFunction: null }, activeTab: { classPropertyName: "activeTab", publicName: "activeTab", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: `
    <div class="gom-tab-content" *ngIf="tabId() === activeTab()">
      <ng-content></ng-content>
    </div>
  `, isInline: true, styles: [".gom-tab-content{animation:fadeIn .2s ease}@keyframes fadeIn{0%{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomTabContentComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-tab-content', standalone: true, imports: [CommonModule], template: `
    <div class="gom-tab-content" *ngIf="tabId() === activeTab()">
      <ng-content></ng-content>
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [".gom-tab-content{animation:fadeIn .2s ease}@keyframes fadeIn{0%{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}\n"] }]
        }], propDecorators: { tabId: [{ type: i0.Input, args: [{ isSignal: true, alias: "tabId", required: false }] }], activeTab: [{ type: i0.Input, args: [{ isSignal: true, alias: "activeTab", required: false }] }] } });

class GomAlertToastService {
    constructor() {
        this.currentToast = signal(null, ...(ngDevMode ? [{ debugName: "currentToast" }] : []));
        this.timeoutId = null;
    }
    show(toast) {
        this.clearTimer();
        this.currentToast.set({
            ...toast,
            durationMs: toast.durationMs ?? 3500,
        });
        this.timeoutId = setTimeout(() => {
            this.dismiss();
        }, this.currentToast().durationMs);
    }
    success(message, title = 'Success', durationMs = 3000) {
        this.show({ message, title, variant: 'success', durationMs });
    }
    error(message, title = 'Error', durationMs = 4500) {
        this.show({ message, title, variant: 'error', durationMs });
    }
    info(message, title = 'Info', durationMs = 3500) {
        this.show({ message, title, variant: 'info', durationMs });
    }
    warning(message, title = 'Warning', durationMs = 4000) {
        this.show({ message, title, variant: 'warning', durationMs });
    }
    dismiss() {
        this.clearTimer();
        this.currentToast.set(null);
    }
    clearTimer() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAlertToastService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAlertToastService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAlertToastService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });

class GomAlertToastComponent {
    constructor() {
        this.toastService = inject(GomAlertToastService);
    }
    dismiss() {
        this.toastService.dismiss();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAlertToastComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomAlertToastComponent, isStandalone: true, selector: "gom-lib-alert-toast", ngImport: i0, template: "@if (toastService.currentToast(); as toast) {\r\n  <div class=\"gom-alert-toast\" [class]=\"'gom-alert-toast gom-alert-toast--' + toast.variant\" role=\"status\" aria-live=\"polite\">\r\n    <div class=\"gom-alert-toast__icon\" aria-hidden=\"true\">\r\n      @if (toast.variant === 'success') {\r\n        <i class=\"ri-checkbox-circle-fill\"></i>\r\n      } @else if (toast.variant === 'error') {\r\n        <i class=\"ri-close-circle-fill\"></i>\r\n      } @else if (toast.variant === 'warning') {\r\n        <i class=\"ri-alert-fill\"></i>\r\n      } @else {\r\n        <i class=\"ri-information-fill\"></i>\r\n      }\r\n    </div>\r\n\r\n    <div class=\"gom-alert-toast__content\">\r\n      @if (toast.title) {\r\n        <p class=\"gom-alert-toast__title\">{{ toast.title }}</p>\r\n      }\r\n      <p class=\"gom-alert-toast__message\">{{ toast.message }}</p>\r\n    </div>\r\n\r\n    <button type=\"button\" class=\"gom-alert-toast__close\" (click)=\"dismiss()\" aria-label=\"Dismiss notification\">\r\n      <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n    </button>\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{position:fixed;top:5.5rem;right:1.5rem;z-index:1100;width:min(26rem,100vw - 2rem);pointer-events:none}.gom-alert-toast{pointer-events:auto;display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:.75rem;padding:1rem;border-radius:.5rem;border:.125rem solid #d8d8d8;background:#fff;box-shadow:0 8px 24px #0f172a29}.gom-alert-toast--success{border-color:#009b0d;background:#d8f0d8}.gom-alert-toast--error{border-color:#eb0a1e;background:#f9d9dc}.gom-alert-toast--warning{border-color:#fa5c00;background:#fbe9e6}.gom-alert-toast--info{border-color:#0a5d8b;background:#e6f7ff}.gom-alert-toast__icon{font-size:1.2rem;line-height:1;margin-top:2px}.gom-alert-toast__content{min-width:0}.gom-alert-toast__title{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-alert-toast__message{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#212121}.gom-alert-toast__close{border:0;background:transparent;color:#58595b;width:1.75rem;height:1.75rem;border-radius:.25rem;display:inline-flex;align-items:center;justify-content:center}.gom-alert-toast__close i{font-size:1rem}.gom-alert-toast__close:hover{background:#0f172a14}@media(max-width:48rem){:host{top:4.75rem;left:1rem;right:1rem;width:auto}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAlertToastComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-alert-toast', standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: "@if (toastService.currentToast(); as toast) {\r\n  <div class=\"gom-alert-toast\" [class]=\"'gom-alert-toast gom-alert-toast--' + toast.variant\" role=\"status\" aria-live=\"polite\">\r\n    <div class=\"gom-alert-toast__icon\" aria-hidden=\"true\">\r\n      @if (toast.variant === 'success') {\r\n        <i class=\"ri-checkbox-circle-fill\"></i>\r\n      } @else if (toast.variant === 'error') {\r\n        <i class=\"ri-close-circle-fill\"></i>\r\n      } @else if (toast.variant === 'warning') {\r\n        <i class=\"ri-alert-fill\"></i>\r\n      } @else {\r\n        <i class=\"ri-information-fill\"></i>\r\n      }\r\n    </div>\r\n\r\n    <div class=\"gom-alert-toast__content\">\r\n      @if (toast.title) {\r\n        <p class=\"gom-alert-toast__title\">{{ toast.title }}</p>\r\n      }\r\n      <p class=\"gom-alert-toast__message\">{{ toast.message }}</p>\r\n    </div>\r\n\r\n    <button type=\"button\" class=\"gom-alert-toast__close\" (click)=\"dismiss()\" aria-label=\"Dismiss notification\">\r\n      <i class=\"ri-close-line\" aria-hidden=\"true\"></i>\r\n    </button>\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}:host{position:fixed;top:5.5rem;right:1.5rem;z-index:1100;width:min(26rem,100vw - 2rem);pointer-events:none}.gom-alert-toast{pointer-events:auto;display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:.75rem;padding:1rem;border-radius:.5rem;border:.125rem solid #d8d8d8;background:#fff;box-shadow:0 8px 24px #0f172a29}.gom-alert-toast--success{border-color:#009b0d;background:#d8f0d8}.gom-alert-toast--error{border-color:#eb0a1e;background:#f9d9dc}.gom-alert-toast--warning{border-color:#fa5c00;background:#fbe9e6}.gom-alert-toast--info{border-color:#0a5d8b;background:#e6f7ff}.gom-alert-toast__icon{font-size:1.2rem;line-height:1;margin-top:2px}.gom-alert-toast__content{min-width:0}.gom-alert-toast__title{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-alert-toast__message{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1rem;font-weight:400;line-height:1.5;color:#212121}.gom-alert-toast__close{border:0;background:transparent;color:#58595b;width:1.75rem;height:1.75rem;border-radius:.25rem;display:inline-flex;align-items:center;justify-content:center}.gom-alert-toast__close i{font-size:1rem}.gom-alert-toast__close:hover{background:#0f172a14}@media(max-width:48rem){:host{top:4.75rem;left:1rem;right:1rem;width:auto}}\n"] }]
        }] });

class GomDynamicFormComponent {
    constructor() {
        this.translate = inject(TranslateService);
        this.fields = [];
        this.selectOptionsBySource = {};
        this.hasFields = computed(() => this.fields.length > 0, ...(ngDevMode ? [{ debugName: "hasFields" }] : []));
    }
    getErrorText(field) {
        const control = this.form?.get(field.key);
        if (!control || !control.invalid || !control.touched) {
            return '';
        }
        if (control.errors?.['required'] && field.validationMessages?.required) {
            return this.translate.instant(field.validationMessages.required);
        }
        if (control.errors?.['minlength'] && field.validationMessages?.minlength) {
            return this.translate.instant(field.validationMessages.minlength);
        }
        if (control.errors?.['maxlength'] && field.validationMessages?.maxlength) {
            return this.translate.instant(field.validationMessages.maxlength);
        }
        if (control.errors?.['min'] && field.validationMessages?.min) {
            return this.translate.instant(field.validationMessages.min);
        }
        if (control.errors?.['max'] && field.validationMessages?.max) {
            return this.translate.instant(field.validationMessages.max);
        }
        if (control.errors?.['pattern'] && field.validationMessages?.pattern) {
            return this.translate.instant(field.validationMessages.pattern);
        }
        return '';
    }
    getSelectOptions(field) {
        if (field.optionsSource) {
            return this.selectOptionsBySource[field.optionsSource] ?? [];
        }
        return (field.options ?? []).map((option) => ({
            value: option.value,
            label: this.translate.instant(option.labelKey),
        }));
    }
    isFieldType(field, type) {
        return field.control === type;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomDynamicFormComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomDynamicFormComponent, isStandalone: true, selector: "gom-lib-dynamic-form", inputs: { form: "form", fields: "fields", selectOptionsBySource: "selectOptionsBySource" }, ngImport: i0, template: "@if (form && hasFields()) {\r\n  <div class=\"gom-dynamic-form\" [formGroup]=\"form\">\r\n    @for (field of fields; track field.key) {\r\n      <div class=\"gom-dynamic-form__group\">\r\n        <label [for]=\"field.key\">{{ field.labelKey | translate }}</label>\r\n\r\n        @if (isFieldType(field, 'input')) {\r\n          <gom-lib-input\r\n            [id]=\"field.key\"\r\n            [type]=\"field.inputType ?? 'text'\"\r\n            [formControlName]=\"field.key\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-input>\r\n        }\r\n\r\n        @if (isFieldType(field, 'textarea')) {\r\n          <gom-lib-textarea\r\n            [id]=\"field.key\"\r\n            [formControlName]=\"field.key\"\r\n            [rows]=\"field.rows ?? 3\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-textarea>\r\n        }\r\n\r\n        @if (isFieldType(field, 'select')) {\r\n          <gom-lib-select\r\n            [id]=\"field.key\"\r\n            [formControlName]=\"field.key\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [options]=\"getSelectOptions(field)\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-select>\r\n        }\r\n      </div>\r\n    }\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-dynamic-form{display:grid;gap:.75rem}.gom-dynamic-form__group{display:grid;gap:.5rem}.gom-dynamic-form__group label{display:block;margin-bottom:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-dynamic-form__group gom-lib-input,.gom-dynamic-form__group gom-lib-textarea,.gom-dynamic-form__group gom-lib-select{width:100%}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "ngmodule", type: ReactiveFormsModule }, { kind: "directive", type: i1$1.NgControlStatus, selector: "[formControlName],[ngModel],[formControl]" }, { kind: "directive", type: i1$1.NgControlStatusGroup, selector: "[formGroupName],[formArrayName],[ngModelGroup],[formGroup],form:not([ngNoForm]),[ngForm]" }, { kind: "directive", type: i1$1.FormGroupDirective, selector: "[formGroup]", inputs: ["formGroup"], outputs: ["ngSubmit"], exportAs: ["ngForm"] }, { kind: "directive", type: i1$1.FormControlName, selector: "[formControlName]", inputs: ["formControlName", "disabled", "ngModel"], outputs: ["ngModelChange"] }, { kind: "ngmodule", type: TranslateModule }, { kind: "component", type: GomInputComponent, selector: "gom-lib-input", inputs: ["label", "required", "type", "min", "max", "step", "placeholder", "inputmode", "hint", "error", "leadingIcon", "clearable", "id", "ariaLabel", "disabled"], outputs: ["valueChange"] }, { kind: "component", type: GomSelectComponent, selector: "gom-lib-select", inputs: ["label", "required", "placeholder", "options", "isDisabled", "hint", "error", "id", "multiple", "selectedValues", "searchable", "searchPlaceholder", "selectAllLabel", "closeMenuTrigger", "ariaLabel"], outputs: ["valueChange", "selectedValuesChange"] }, { kind: "component", type: GomTextareaComponent, selector: "gom-lib-textarea", inputs: ["label", "required", "placeholder", "rows", "hint", "error", "id"], outputs: ["valueChange", "focus"] }, { kind: "pipe", type: i1$2.TranslatePipe, name: "translate" }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomDynamicFormComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-dynamic-form', standalone: true, imports: [
                        CommonModule,
                        ReactiveFormsModule,
                        TranslateModule,
                        GomInputComponent,
                        GomSelectComponent,
                        GomTextareaComponent,
                    ], template: "@if (form && hasFields()) {\r\n  <div class=\"gom-dynamic-form\" [formGroup]=\"form\">\r\n    @for (field of fields; track field.key) {\r\n      <div class=\"gom-dynamic-form__group\">\r\n        <label [for]=\"field.key\">{{ field.labelKey | translate }}</label>\r\n\r\n        @if (isFieldType(field, 'input')) {\r\n          <gom-lib-input\r\n            [id]=\"field.key\"\r\n            [type]=\"field.inputType ?? 'text'\"\r\n            [formControlName]=\"field.key\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-input>\r\n        }\r\n\r\n        @if (isFieldType(field, 'textarea')) {\r\n          <gom-lib-textarea\r\n            [id]=\"field.key\"\r\n            [formControlName]=\"field.key\"\r\n            [rows]=\"field.rows ?? 3\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-textarea>\r\n        }\r\n\r\n        @if (isFieldType(field, 'select')) {\r\n          <gom-lib-select\r\n            [id]=\"field.key\"\r\n            [formControlName]=\"field.key\"\r\n            [placeholder]=\"field.placeholderKey ? (field.placeholderKey | translate) : ''\"\r\n            [options]=\"getSelectOptions(field)\"\r\n            [error]=\"getErrorText(field)\"\r\n          ></gom-lib-select>\r\n        }\r\n      </div>\r\n    }\r\n  </div>\r\n}\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-dynamic-form{display:grid;gap:.75rem}.gom-dynamic-form__group{display:grid;gap:.5rem}.gom-dynamic-form__group label{display:block;margin-bottom:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5;color:#0a5d8b}.gom-dynamic-form__group gom-lib-input,.gom-dynamic-form__group gom-lib-textarea,.gom-dynamic-form__group gom-lib-select{width:100%}\n"] }]
        }], propDecorators: { form: [{
                type: Input,
                args: [{ required: true }]
            }], fields: [{
                type: Input
            }], selectOptionsBySource: [{
                type: Input
            }] } });

class GomDynamicFormLoaderService {
    constructor() {
        this.http = inject(HttpClient);
    }
    loadConfig(source, fallback) {
        const request = this.http.get(source.path).pipe(map((config) => this.normalizeConfig(config)));
        if (!fallback) {
            return request;
        }
        return request.pipe(catchError(() => of(this.normalizeConfig(fallback))));
    }
    createFormGroup(fb, fields, defaults = {}, initialValues = {}) {
        const controls = {};
        for (const field of fields) {
            const validators = this.getValidators(field);
            const defaultValue = this.resolveDefaultValue(field, defaults, initialValues);
            controls[field.key] = [defaultValue, validators];
        }
        return fb.group(controls);
    }
    resolveDefaultValue(field, defaults, initialValues) {
        if (Object.prototype.hasOwnProperty.call(initialValues, field.key)) {
            return initialValues[field.key];
        }
        if (Object.prototype.hasOwnProperty.call(defaults, field.key)) {
            return defaults[field.key];
        }
        if (field.defaultValue !== undefined) {
            return field.defaultValue;
        }
        return '';
    }
    getValidators(field) {
        const validators = [];
        if (field.validators?.required) {
            validators.push(Validators.required);
        }
        if (typeof field.validators?.minLength === 'number') {
            validators.push(Validators.minLength(field.validators.minLength));
        }
        if (typeof field.validators?.maxLength === 'number') {
            validators.push(Validators.maxLength(field.validators.maxLength));
        }
        if (typeof field.validators?.min === 'number') {
            validators.push(Validators.min(field.validators.min));
        }
        if (typeof field.validators?.max === 'number') {
            validators.push(Validators.max(field.validators.max));
        }
        if (field.validators?.pattern) {
            validators.push(Validators.pattern(field.validators.pattern));
        }
        return validators;
    }
    normalizeConfig(config) {
        return {
            fields: Array.isArray(config.fields) ? config.fields : [],
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomDynamicFormLoaderService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomDynamicFormLoaderService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomDynamicFormLoaderService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

class GomAccordionComponent {
    constructor() {
        this.title = '';
        this.subtitle = '';
        this.expanded = false;
        this.disabled = false;
        this.expandedChange = new EventEmitter();
        this.toggleState = new EventEmitter();
    }
    onTriggerClick() {
        if (this.disabled) {
            return;
        }
        const next = !this.expanded;
        this.expanded = next;
        this.expandedChange.emit(next);
        this.toggleState.emit(next);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAccordionComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.19", type: GomAccordionComponent, isStandalone: true, selector: "gom-lib-accordion", inputs: { title: "title", subtitle: "subtitle", expanded: "expanded", disabled: "disabled" }, outputs: { expandedChange: "expandedChange", toggleState: "toggleState" }, ngImport: i0, template: "<section class=\"gom-accordion\" [class.gom-accordion--expanded]=\"expanded\" [class.gom-accordion--disabled]=\"disabled\">\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-accordion__trigger\"\r\n    [attr.aria-expanded]=\"expanded\"\r\n    [disabled]=\"disabled\"\r\n    (click)=\"onTriggerClick()\"\r\n  >\r\n    <div class=\"gom-accordion__header-content\">\r\n      <h3 class=\"gom-accordion__title\">{{ title }}</h3>\r\n      @if (subtitle) {\r\n        <p class=\"gom-accordion__subtitle\">{{ subtitle }}</p>\r\n      }\r\n    </div>\r\n    <span class=\"gom-accordion__chevron\" aria-hidden=\"true\">\r\n      <i class=\"ri-arrow-right-s-line\"></i>\r\n    </span>\r\n  </button>\r\n\r\n  @if (expanded) {\r\n    <div class=\"gom-accordion__body\">\r\n      <ng-content></ng-content>\r\n    </div>\r\n  }\r\n</section>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-accordion{border:.0625rem solid #d8d8d8;border-radius:.75rem;background:#fff;overflow:hidden}.gom-accordion__trigger{width:100%;border:none;background:transparent;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem;cursor:pointer}.gom-accordion__header-content{display:grid;gap:.25rem}.gom-accordion__title{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1.125rem;font-weight:700;line-height:1.2;margin:0}.gom-accordion__subtitle{margin:0;color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5}.gom-accordion__chevron{color:#58595b;transition:transform .2s ease}.gom-accordion--expanded .gom-accordion__chevron{transform:rotate(90deg)}.gom-accordion__body{padding:0 1rem 1rem}.gom-accordion__trigger:disabled{cursor:not-allowed;opacity:.6}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.19", ngImport: i0, type: GomAccordionComponent, decorators: [{
            type: Component,
            args: [{ selector: 'gom-lib-accordion', standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: "<section class=\"gom-accordion\" [class.gom-accordion--expanded]=\"expanded\" [class.gom-accordion--disabled]=\"disabled\">\r\n  <button\r\n    type=\"button\"\r\n    class=\"gom-accordion__trigger\"\r\n    [attr.aria-expanded]=\"expanded\"\r\n    [disabled]=\"disabled\"\r\n    (click)=\"onTriggerClick()\"\r\n  >\r\n    <div class=\"gom-accordion__header-content\">\r\n      <h3 class=\"gom-accordion__title\">{{ title }}</h3>\r\n      @if (subtitle) {\r\n        <p class=\"gom-accordion__subtitle\">{{ subtitle }}</p>\r\n      }\r\n    </div>\r\n    <span class=\"gom-accordion__chevron\" aria-hidden=\"true\">\r\n      <i class=\"ri-arrow-right-s-line\"></i>\r\n    </span>\r\n  </button>\r\n\r\n  @if (expanded) {\r\n    <div class=\"gom-accordion__body\">\r\n      <ng-content></ng-content>\r\n    </div>\r\n  }\r\n</section>\r\n", styles: [":root{--color-primary: #0a5d8b;--color-primary-light: #e6f7ff;--color-primary-dark: #052f46;--color-text-primary: #0a5d8b;--color-text-default: #212121;--color-text-disabled: #767676;--color-bg-standard: #ffffff;--color-bg-secondary: #f6f6f6;--color-border-standard: #d8d8d8;--color-success: #009b0d;--color-warning: #fa5c00;--color-danger: #eb0a1e;--color-info: #fbd03b;--spacing-xs: .5rem;--spacing-sm: 1rem;--spacing-md: 1.5rem;--spacing-lg: 2rem;--radius-xs: .25rem;--radius-sm: .5rem;--radius-md: .75rem;--font-family-body: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;--font-size-body: 1rem;--font-size-heading: 1.875rem}.gom-accordion{border:.0625rem solid #d8d8d8;border-radius:.75rem;background:#fff;overflow:hidden}.gom-accordion__trigger{width:100%;border:none;background:transparent;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1rem;cursor:pointer}.gom-accordion__header-content{display:grid;gap:.25rem}.gom-accordion__title{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:1.125rem;font-weight:700;line-height:1.2;margin:0}.gom-accordion__subtitle{margin:0;color:#58595b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",Segoe UI Symbol;font-size:.875rem;font-weight:500;line-height:1.5}.gom-accordion__chevron{color:#58595b;transition:transform .2s ease}.gom-accordion--expanded .gom-accordion__chevron{transform:rotate(90deg)}.gom-accordion__body{padding:0 1rem 1rem}.gom-accordion__trigger:disabled{cursor:not-allowed;opacity:.6}\n"] }]
        }], propDecorators: { title: [{
                type: Input
            }], subtitle: [{
                type: Input
            }], expanded: [{
                type: Input
            }], disabled: [{
                type: Input
            }], expandedChange: [{
                type: Output
            }], toggleState: [{
                type: Output
            }] } });

/**
 * Shared Theming Module Public API
 * Export theme utilities for use across the application
 */

/*
 * Public API Surface of @gom/ui
 */
// Main module

/**
 * Generated bundle index. Do not edit.
 */

export { FormControlsModule, GOM_ACTION_BUTTON_POLICY, GomAccordionComponent, GomAlertToastComponent, GomAlertToastService, GomButtonComponent, GomCardComponent, GomCheckboxComponent, GomChipComponent, GomConfirmationModalComponent, GomDynamicFormComponent, GomDynamicFormLoaderService, GomInputComponent, GomModalComponent, GomSelectComponent, GomSwitchComponent, GomTabContentComponent, GomTableComponent, GomTableService, GomTabsComponent, GomTextareaComponent, MenuComponent, MenuModule, SharedModule, ThemeService, ThemedModule, getButtonContentMode, showButtonIcon, showButtonText };
//# sourceMappingURL=gomlibs-ui.mjs.map

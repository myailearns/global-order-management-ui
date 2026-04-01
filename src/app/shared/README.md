# Shared Module - GOM-UI

Central location for all shared utilities, components, and theming for the Global Order Management UI application.

## Directory Structure

```
shared/
├── theming/
│   ├── styles/
│   │   ├── _palette.scss          → Color palettes (Primary, Green, Orange, Red, Yellow, Grey)
│   │   ├── _semantic-colors.scss  → Semantic color mappings (text, background, border, shadow)
│   │   ├── _breakpoints.scss      → Responsive breakpoints (xs, sm, md, lg, xl)
│   │   ├── _sizing.scss           → Spacing, gaps, radius, sizes scale
│   │   ├── _typography.scss       → Font sizes, weights, line heights
│   │   └── _theme.scss            → Main theme export + CSS variables
│   ├── services/
│   │   └── theme.service.ts       → Theme switching service
│   ├── theming.module.ts          → Theming module
│   └── index.ts                   → Public API
│
├── components/                    → Shared components (to be created)
│   ├── form-controls/             → Form input components
│   ├── layout/                    → Layout components
│   └── ...
│
├── shared.module.ts               → Shared module aggregator
└── index.ts                       → Public API
```

## Getting Started

### 1. Import Theming in Your App

The theming is automatically imported in `app.config.ts`:

```typescript
import { ThemedModule } from './shared/theming/theming.module';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(ThemedModule),
  ],
};
```

### 2. Use Theme in Components

```scss
@use 'src/app/shared/theming/styles/theme' as *;

.my-component {
  color: get-text(primary);
  background: get-background(standard);
  padding: get-spacing(md);
  border-radius: get-radius(md);
  
  @include breakpoint-up(md) {
    width: 50%;
  }
}
```

### 3. Dynamic Theme Switching

```typescript
import { Component } from '@angular/core';
import { ThemeService } from 'src/app/shared/theming';

@Component({...})
export class MyComponent {
  constructor(private themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  getCurrentTheme() {
    return this.themeService.getTheme();
  }
}
```

## Theme Functions

### Colors

```scss
// Get a color from palette
get-color($palette-primary, 500)      // #0a5d8b

// Get semantic text color
get-text(primary)                     // Color value
get-text(danger)
get-text(disabled)

// Get semantic background color
get-background(standard)              // Color value
get-background(primary)
get-background(success)

// Get semantic border color
get-border(standard)                  // Color value
get-border(primary)
get-border(danger)

// Get data visualization color
get-data-viz-color(blue)              // Color value
```

### Breakpoints & Responsive Design

```scss
// Mobile-first mixin
@include breakpoint-up(md) {
  width: 50%;
}

// Desktop-first mixin
@include breakpoint-down(lg) {
  width: 100%;
}

// Range mixin
@include breakpoint-between(sm, lg) {
  width: 75%;
}

// Specific breakpoint only
@include breakpoint-only(md) {
  width: 66.66%;
}
```

### Sizing & Spacing

```scss
// Spacing (padding/margin)
padding: get-spacing(md);             // 1.5rem = 24px
margin: get-spacing(sm);              // 1rem = 16px

// Gaps (flexbox/grid space-between)
gap: get-gap(md);                     // 1rem = 16px

// Border radius
border-radius: get-radius(md);        // 0.75rem = 12px

// Border size
border: get-border-size(thin) solid;  // 0.125rem = 2px thick

// Size values
width: get-size(sm);                  // 12rem = 192px
```

### Typography

```scss
// Use typography mixins
@include typography-body;             // Standard body text
@include typography-heading(lg);      // Large heading
@include typography-label;            // Form label
@include typography-caption;          // Small caption

// Get font values
font-size: get-font-size(body);       // 1rem = 16px
font-weight: get-font-weight(bold);   // 700
line-height: get-line-height(normal); // 1.5
```

## Breakpoint Reference

| Name | Value (rem) | Value (px) | Device |
|------|------------|-----------|--------|
| xs   | 23.4375    | 375       | Extra Small |
| sm   | 26.75      | 428       | Small Phone |
| md   | 52.5       | 840       | Tablet |
| lg   | 90         | 1440      | Desktop |
| xl   | 120        | 1920      | Wide Desktop |

## Color Palettes

### Primary (Brand)
- 50: #e6f7ff
- 500: #0a5d8b (Main)
- 900: #052f46

### Success (Green)
- 50: #d8f0d8
- 500: #009b0d (Main)
- 900: #014803

### Warning (Orange)
- 50: #fbe9e6
- 500: #fa5c00 (Main)
- 900: #bc3900

### Danger (Red)
- 50: #f9d9dc
- 500: #eb0a1e (Main)
- 900: #92050a

### Neutral (Grey)
- 50: #f6f6f6 (Light)
- 500: #9e9e9e (Medium)
- 900: #212121 (Dark)

## CSS Variables

All theme values are exposed as CSS custom properties:

```css
/* Colors */
--color-primary
--color-text-primary
--color-text-default
--color-bg-standard
--color-border-standard
--color-success
--color-warning
--color-danger

/* Spacing */
--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg

/* Sizing */
--radius-xs
--radius-sm
--radius-md

/* Typography */
--font-family-body
--font-size-body
--font-size-heading
```

## Storybook

Run Storybook to view and test the theming system:

```bash
npm run storybook
```

This will start Storybook at `http://localhost:6006`

View the theming demo:
- Navigate to: **Shared → Theming → Overview**

## Adding New Components

When creating shared components:

1. **Create component folder** under `components/`
2. **Import theming** in component SCSS
3. **Use theme functions** for all styling
4. **Create `.stories.ts`** for Storybook documentation
5. **Export from `shared.module.ts`**

Example:

```typescript
// my-button.component.scss
@use 'src/app/shared/theming/styles/theme' as *;

.my-button {
  padding: get-spacing(sm) get-spacing(md);
  background-color: get-background(primary);
  color: get-text(on-primary);
  border-radius: get-radius(sm);
}
```

```typescript
// my-button.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'gom-button',
  template: `<button><ng-content></ng-content></button>`,
  styleUrl: './my-button.component.scss',
})
export class MyButtonComponent {}
```

```typescript
// Export from shared.module.ts
import { MyButtonComponent } from './components/my-button.component';

@NgModule({
  imports: [MyButtonComponent],
  exports: [MyButtonComponent],
})
export class SharedModule {}
```

## Next Steps

- [ ] Create form control components (Input, Checkbox, Radio, etc.)
- [ ] Create layout components (Card, Header, Footer, etc.)
- [ ] Add more Storybook stories for components
- [ ] Document component API
- [ ] Set up component testing

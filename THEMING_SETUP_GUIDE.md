# GOM-UI - Theming & Shared Module Setup Guide

## ✅ What's Been Implemented

### 1. **SCSS Theming System** ✓
A complete, production-ready theming infrastructure with:

- **Color System** (`_palette.scss`)
  - 6 color palettes (Primary, Green, Orange, Red, Yellow, Grey)
  - 10 shades per palette (50-900)
  - Data visualization colors
  - Accessor functions: `get-color()`, `get-data-viz-color()`

- **Semantic Colors** (`_semantic-colors.scss`)
  - Text colors (primary, danger, disabled, etc.)
  - Background colors (standard, primary, success, warning, danger, info)
  - Border colors (standard, primary, danger, etc.)
  - Shadow colors for depth
  - Accessor functions: `get-text()`, `get-background()`, `get-border()`, `get-shadow()`

- **Responsive Breakpoints** (`_breakpoints.scss`)
  - 5 major breakpoints: xs, sm, md, lg, xl
  - Mobile-first and desktop-first mixins
  - Range queries and exact breakpoint targeting
  - Functions: `get-breakpoint()`, `@include breakpoint-up()`, `@include breakpoint-down()`

- **Sizing System** (`_sizing.scss`)
  - Spacing scale (xxs, xs, sm, md, lg, xl, xxl)
  - Gaps for flexbox/grid layouts
  - Border radius options
  - Border sizes
  - Size values for widths/heights
  - Functions: `get-spacing()`, `get-gap()`, `get-radius()`, `get-border-size()`, `get-size()`

- **Typography** (`_typography.scss`)
  - Font family stacks
  - 10 font sizes (xs to 3xl)
  - Font weights (light to extrabold)
  - Line heights (tight to loose)
  - Typography mixins: `@include typography-body()`, `@include typography-heading()`, etc.

- **CSS Variables** (`_theme.scss`)
  - All theme values exposed as CSS custom properties
  - Easy runtime updates
  - Accessible from JavaScript

### 2. **Theming Service** ✓
`src/app/shared/theming/services/theme.service.ts`

Features:
- Theme mode management (light, dark, auto)
- System preference detection
- LocalStorage persistence
- CSS variable setters/getters
- Signal-based reactive updates
- Theme toggle functionality

Usage:
```typescript
import { ThemeService } from './shared/theming';

constructor(private themeService: ThemeService) {}

toggleTheme() {
  this.themeService.toggleTheme();
}
```

### 3. **Shared Module** ✓
`src/app/shared/` - Central hub for shared functionality

Structure:
```
shared/
├── theming/
│   ├── styles/          → SCSS theme files
│   ├── services/        → ThemeService
│   └── index.ts         → Public API
├── components/          → Shared components (ready for implementation)
│   └── form-controls/   → Form input components
├── shared.module.ts     → Aggregator module
├── index.ts             → Public API
└── README.md            → Full documentation
```

### 4. **Global Styles** ✓
`src/styles.scss` - Application-wide styling

Includes:
- Global resets and base styles
- HTML/body defaults
- Heading styles using theme typography
- Form element styling
- Link styles
- Table styles
- Code block styling
- Utility classes

### 5. **Storybook Setup** ✓
Complete Storybook configuration with:

- **Main config** (`.storybook/main.ts`)
  - Angular framework setup
  - Addon configuration
  - Documentation auto-generation

- **Preview config** (`.storybook/preview.ts`)
  - Responsive breakpoint presets
  - Background color options
  - Viewport sizing

- **Theming Demo** (`.storybook/theming.stories.ts`)
  - Interactive color palette showcase
  - Breakpoints reference table
  - Typography demonstration
  - Semantic colors demo
  - Spacing scale visualization

### 6. **Package.json Updates** ✓
Added scripts:
```json
{
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

Added dependencies:
- @storybook/angular
- @storybook/addon-* (a11y, backgrounds, essentials, interactions, links, onboarding, viewport)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Start Storybook
```bash
npm run storybook
```

View theming demo: **Shared → Theming → Overview**

---

## 📖 Usage Examples

### Use Theme in Components

```scss
// component.component.scss
@use 'src/app/shared/theming/styles/theme' as *;

.my-component {
  // Colors
  color: get-text(primary);
  background-color: get-background(standard);
  border-color: get-border(standard);
  
  // Spacing
  padding: get-spacing(md);
  margin: get-spacing(lg);
  gap: get-gap(sm);
  
  // Sizing
  border-radius: get-radius(md);
  border: get-border-size(thin) solid;
  
  // Typography
  @include typography-body;
  
  // Responsive design
  @include breakpoint-up(md) {
    width: 50%;
  }
  
  @include breakpoint-down(lg) {
    width: 100%;
  }
}
```

### Inject ThemeService in Component

```typescript
import { Component } from '@angular/core';
import { ThemeService } from 'src/app/shared/theming';

@Component({
  selector: 'gom-theme-toggle',
  template: `
    <button (click)="toggleTheme()">
      {{ themeService.getTheme() === 'light' ? '🌙' : '☀️' }}
    </button>
  `,
})
export class ThemeToggleComponent {
  constructor(public themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
```

### Use CSS Variables in JavaScript

```typescript
const themeService = inject(ThemeService);

// Set custom color
themeService.setCSSVariable('color-primary', '#new-color');

// Get current color
const primaryColor = themeService.getCSSVariable('color-primary');
```

### CSS Variables in HTML

```html
<div style="color: var(--color-primary);">
  Using CSS variable for color
</div>
```

---

## 📚 Color Reference

**Primary (Brand)**: #0a5d8b
**Success**: #009b0d
**Warning**: #fa5c00
**Danger**: #eb0a1e
**Info**: #fbd03b

---

## 📏 Spacing Reference

| Name | Value | Size |
|------|-------|------|
| xxs  | 0.25rem | 4px |
| xs   | 0.5rem  | 8px |
| sm   | 1rem    | 16px |
| md   | 1.5rem  | 24px |
| lg   | 2rem    | 32px |
| xl   | 3rem    | 48px |
| xxl  | 4rem    | 64px |

---

## 📱 Breakpoints Reference

| Name | Value | Size | Device |
|------|-------|------|--------|
| xs   | 23.4375rem | 375px | Extra Small |
| sm   | 26.75rem | 428px | Small Phone |
| md   | 52.5rem | 840px | Tablet |
| lg   | 90rem | 1440px | Desktop |
| xl   | 120rem | 1920rem | Wide Desktop |

---

## 🔄 Next Steps

### Phase 2: Form Control Components
Create reusable form components:
- [ ] Input (`components/form-controls/input/`)
- [ ] Checkbox (`components/form-controls/checkbox/`)
- [ ] Radio (`components/form-controls/radio/`)
- [ ] Select (`components/form-controls/select/`)
- [ ] Textarea (`components/form-controls/textarea/`)
- [ ] Button (`components/form-controls/button/`)

### Phase 3: Layout Components
- [ ] Card
- [ ] Header
- [ ] Footer
- [ ] Layout container

### Phase 4: Advanced Components
- [ ] Modal/Dialog
- [ ] Toast/Snack bar
- [ ] Tabs
- [ ] Accordion
- [ ] Table

---

## 📝 File Structure

```
gom-ui/
├── src/
│   ├── app/
│   │   ├── shared/                          ← Shared Module
│   │   │   ├── theming/
│   │   │   │   ├── styles/
│   │   │   │   │   ├── _palette.scss
│   │   │   │   │   ├── _semantic-colors.scss
│   │   │   │   │   ├── _breakpoints.scss
│   │   │   │   │   ├── _sizing.scss
│   │   │   │   │   ├── _typography.scss
│   │   │   │   │   └── _theme.scss
│   │   │   │   ├── services/
│   │   │   │   │   └── theme.service.ts
│   │   │   │   ├── theming.module.ts
│   │   │   │   └── index.ts
│   │   │   ├── components/
│   │   │   │   └── form-controls/    (to be created)
│   │   │   ├── shared.module.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── app.config.ts              (updated with ThemedModule)
│   │   └── ...
│   ├── styles.scss                    (updated with theme imports)
│   └── ...
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── theming.stories.ts
├── package.json                       (updated with Storybook scripts & deps)
└── ...
```

---

## ✨ Summary

You now have:

✅ **Complete theming system** - Colors, breakpoints, typography, sizing
✅ **Theming service** - Dynamic theme switching
✅ **Global styles** - App-wide styling with theme integration
✅ **Shared module** - Central export for team-wide utilities
✅ **Storybook setup** - Component documentation and testing
✅ **Production-ready structure** - Scalable for growth

**Ready to implement components using this theming system! 🎉**

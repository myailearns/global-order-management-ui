# 🚀 Quick Start - GOM-UI Theming System

## Installation

```bash
# Install dependencies
npm install

# This will install Angular 20, Storybook 8, and all necessary tools
```

## Running the Application

### Development Server
```bash
npm start
# Opens: http://localhost:4200
```

### Storybook (Component Showcase)
```bash
npm run storybook
# Opens: http://localhost:6006

# View theming demo:
# Navigation: Shared → Theming → Overview
```

### Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
# Output in: dist/gom-ui
```

---

## 📁 Key Files to Explore

### Theme Configuration
- `src/app/shared/theming/styles/_theme.scss` - Main theme export
- `src/app/shared/theming/styles/_palette.scss` - Color definitions
- `src/app/shared/theming/styles/_breakpoints.scss` - Responsive design
- `src/app/shared/theming/styles/_semantic-colors.scss` - Color semantics
- `src/app/shared/theming/styles/_sizing.scss` - Spacing/sizing

### Services
- `src/app/shared/theming/services/theme.service.ts` - Theme control

### Module Setup
- `src/app/shared/theming/theming.module.ts` - Module definition
- `src/app/app.config.ts` - App configuration (imports ThemedModule)

### Global Styling
- `src/styles.scss` - Global styles using theme

### Documentation
- `src/app/shared/README.md` - Full theming documentation
- `THEMING_SETUP_GUIDE.md` - Setup and usage guide
- `IMPLEMENTATION_SUMMARY.md` - What was implemented

---

## 📊 Theming System Overview

### Color Palettes (6 total)
```
Primary (Brand)     - #0a5d8b
Success (Green)     - #009b0d
Warning (Orange)    - #fa5c00
Danger (Red)        - #eb0a1e
Info (Yellow)       - #fbd03b
Neutral (Grey)      - #9e9e9e
```

### Breakpoints (5 total)
```
xs (Extra Small)    - 375px   (mobile)
sm (Small)          - 428px   (phone)
md (Medium)         - 840px   (tablet)
lg (Large)          - 1440px  (desktop)
xl (Extra Large)    - 1920px  (wide desktop)
```

### Spacing Scale (7 levels)
```
xxs - 4px
xs  - 8px
sm  - 16px
md  - 24px
lg  - 32px
xl  - 48px
xxl - 64px
```

---

## 🎨 Using the Theme in Components

### SCSS Example
```scss
@use 'src/app/shared/theming/styles/theme' as *;

.card {
  background-color: get-background(standard);
  color: get-text(default);
  padding: get-spacing(md);
  border-radius: get-radius(md);
  border: get-border-size(thin) solid get-border(standard);
  
  /* Responsive padding */
  @include breakpoint-up(md) {
    padding: get-spacing(lg);
  }
}
```

### TypeScript Example
```typescript
import { ThemeService } from 'src/app/shared';

@Component({...})
export class MyComponent {
  constructor(private themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
```

---

## 🎯 Next Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Storybook**
   ```bash
   npm run storybook
   ```

3. **View theming demo**
   - Navigate to: Shared → Theming → Overview

4. **Create first component**
   - Create folder: `src/app/shared/components/form-controls/input/`
   - Use theming system in component styles
   - Create `.stories.ts` file for Storybook

---

## 🐛 Troubleshooting

### Storybook won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run storybook
```

### Styles not loading
```bash
# Make sure you're using the correct import path
@use 'src/app/shared/theming/styles/theme' as *;
```

### Theme not applied
```bash
# Check that app.config.ts imports ThemedModule
// app.config.ts
import { ThemedModule } from './shared/theming/theming.module';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(ThemedModule),
    // ...
  ]
};
```

---

## 📞 Reference

**Storybook Docs**: http://localhost:6006 (when running)
**App Docs**: http://localhost:4200 (when running)

**Port Configuration**:
- Development: 4200
- Storybook: 6006

---

## ✅ Setup Verification Checklist

- [ ] `npm install` completed successfully
- [ ] `npm start` runs without errors
- [ ] `npm run storybook` opens at localhost:6006
- [ ] Can see theming demo in Storybook
- [ ] Global styles are applied to app
- [ ] Can toggle between themes (once theme toggle is added)

**All set! 🎉**

import { NgModule } from '@angular/core';
import { ThemeService } from './services/theme.service';

/**
 * Theming Module for GOM-UI
 * Provides theme configuration and theming utilities
 * 
 * Usage:
 *   1. Import in app.config.ts: importProvidersFrom(ThemedModule)
 *   2. Import styles in global styles: @use './app/shared/theming/styles/theme';
 *   3. Inject ThemeService in components for dynamic theme switching
 */
@NgModule({
  providers: [ThemeService],
})
export class ThemedModule {}

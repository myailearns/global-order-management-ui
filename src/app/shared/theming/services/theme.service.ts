import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Theme Service for GOM-UI
 * Manages theme switching and CSS variable updates at runtime
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeMode = signal<ThemeMode>('light');
  public readonly themeMode$ = this.themeMode.asReadonly();

  constructor() {
    this.initializeTheme();
  }

  /**
   * Initialize theme based on system preference or localStorage
   */
  private initializeTheme(): void {
    const savedTheme = this.getSavedTheme();
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.detectSystemTheme();
    }
  }

  /**
   * Detect system theme preference
   */
  private detectSystemTheme(): void {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  /**
   * Get saved theme from localStorage
   */
  private getSavedTheme(): ThemeMode | null {
    const saved = localStorage.getItem('gom-ui-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
    return null;
  }

  /**
   * Set theme and persist to localStorage
   */
  public setTheme(theme: ThemeMode): void {
    this.themeMode.set(theme);
    localStorage.setItem('gom-ui-theme', theme);

    // Update document class
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    document.documentElement.classList.add(`theme-${theme}`);

    // Update color scheme meta tag
    if (theme === 'dark') {
      document.documentElement.style.colorScheme = 'dark';
    } else if (theme === 'light') {
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.style.colorScheme = 'light dark';
    }
  }

  /**
   * Toggle between light and dark themes
   */
  public toggleTheme(): void {
    const current = this.themeMode();
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  /**
   * Get current theme
   */
  public getTheme(): ThemeMode {
    return this.themeMode();
  }

  /**
   * Set CSS variable at runtime
   * @param variable - CSS variable name (without --)
   * @param value - CSS variable value
   */
  public setCSSVariable(variable: string, value: string): void {
    document.documentElement.style.setProperty(`--${variable}`, value);
  }

  /**
   * Get CSS variable value
   * @param variable - CSS variable name (without --)
   */
  public getCSSVariable(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variable}`).trim();
  }
}

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'te' | 'hi';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly translate = inject(TranslateService);
  private readonly storageKey = 'gom-ui-lang';

  readonly supportedLanguages: AppLanguage[] = ['en', 'te', 'hi'];
  readonly defaultLanguage: AppLanguage = 'en';

  init(): void {
    this.translate.addLangs(this.supportedLanguages);
    this.translate.setDefaultLang(this.defaultLanguage);

    const saved = this.getSavedLanguage();
    this.useLanguage(saved || this.defaultLanguage);
  }

  useLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    localStorage.setItem(this.storageKey, lang);
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  currentLanguage(): AppLanguage {
    const current = this.translate.currentLang as AppLanguage | undefined;
    if (current && this.supportedLanguages.includes(current)) {
      return current;
    }
    return this.defaultLanguage;
  }

  private getSavedLanguage(): AppLanguage | null {
    const value = localStorage.getItem(this.storageKey);
    if (value && this.supportedLanguages.includes(value as AppLanguage)) {
      return value as AppLanguage;
    }
    return null;
  }
}

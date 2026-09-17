import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HeaderSearchService {
  readonly activeContext = signal<string | null>(null);
  readonly placeholder = signal('Search');
  readonly value = signal('');

  activate(context: string, placeholder: string, initialValue = ''): void {
    this.activeContext.set(String(context || '').trim() || null);
    this.placeholder.set(String(placeholder || '').trim() || 'Search');
    this.value.set(String(initialValue || ''));
  }

  deactivate(context?: string): void {
    const normalized = String(context || '').trim();
    if (normalized && this.activeContext() !== normalized) {
      return;
    }

    this.activeContext.set(null);
    this.placeholder.set('Search');
    this.value.set('');
  }

  setValue(nextValue: string): void {
    const normalized = String(nextValue || '');
    if (this.value() === normalized) {
      return;
    }

    this.value.set(normalized);
  }
}

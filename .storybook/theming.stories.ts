/**
 * Shared Theming Demo
 * Storybook documentation for the GOM-UI theming system
 */

import { Meta, StoryObj } from '@storybook/angular';
import { Component, signal } from '@angular/core';
import { ThemeService } from '../src/app/shared/theming/services/theme.service';

@Component({
  selector: 'gom-theming-demo',
  standalone: true,
  template: `
    <div class="theming-demo">
      <h1>GOM-UI Theming System</h1>

      <section class="demo-section">
        <h2>Color Palette</h2>
        <div class="color-grid">
          <div
            *ngFor="let color of colorPalette"
            class="color-box"
            [style.background-color]="color.value"
            [title]="color.name"
          >
            <span class="color-label">{{ color.name }}</span>
            <span class="color-code">{{ color.value }}</span>
          </div>
        </div>
      </section>

      <section class="demo-section">
        <h2>Responsive Breakpoints</h2>
        <table class="breakpoints-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value (rem)</th>
              <th>Value (px)</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bp of breakpoints">
              <td>{{ bp.name }}</td>
              <td>{{ bp.rem }}</td>
              <td>{{ bp.px }}</td>
              <td>{{ bp.device }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="demo-section">
        <h2>Typography</h2>
        <div class="typography-showcase">
          <h1>Heading 1 (3xl)</h1>
          <h2>Heading 2 (xxl)</h2>
          <h3>Heading 3 (xl)</h3>
          <h4>Heading 4 (lg)</h4>
          <h5>Heading 5 (md)</h5>
          <h6>Heading 6 (sm)</h6>
          <p>Body text - This is standard paragraph text using the body typography style.</p>
          <label>Form label - This is how form labels should look</label>
          <small>Small text - Caption or helper text</small>
        </div>
      </section>

      <section class="demo-section">
        <h2>Semantic Colors</h2>
        <div class="semantic-grid">
          <div class="semantic-box semantic-primary">
            <h3>Primary</h3>
            <p>Main brand color</p>
          </div>
          <div class="semantic-box semantic-success">
            <h3>Success</h3>
            <p>Positive/confirmation state</p>
          </div>
          <div class="semantic-box semantic-warning">
            <h3>Warning</h3>
            <p>Alert/caution state</p>
          </div>
          <div class="semantic-box semantic-danger">
            <h3>Danger</h3>
            <p>Error/destructive state</p>
          </div>
          <div class="semantic-box semantic-info">
            <h3>Info</h3>
            <p>Informational state</p>
          </div>
        </div>
      </section>

      <section class="demo-section">
        <h2>Spacing Scale</h2>
        <div class="spacing-showcase">
          <div *ngFor="let space of spacingScale" class="spacing-item">
            <div class="spacing-name">{{ space.name }}</div>
            <div
              class="spacing-box"
              [style.width.rem]="space.value"
              [style.height.rem]="0.5"
            >
              {{ space.rem }}
            </div>
            <div class="spacing-value">{{ space.px }}</div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      @use 'src/app/shared/theming/styles/theme' as *;

      .theming-demo {
        padding: get-spacing(lg);
        font-family: $font-family;
      }

      .demo-section {
        margin-bottom: get-spacing(xxl);

        h2 {
          @include typography-heading(lg);
          margin-bottom: get-spacing(md);
          color: get-text(primary);
        }
      }

      /* Color Grid */
      .color-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
        gap: get-gap(md);
      }

      .color-box {
        border-radius: get-radius(md);
        padding: get-spacing(md);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 6rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }

      .color-label {
        font-weight: get-font-weight(bold);
        text-align: center;
        font-size: get-font-size(sm);
        margin-bottom: get-spacing(xs);
      }

      .color-code {
        font-family: $font-family-mono;
        font-size: get-font-size(xs);
        opacity: 0.8;
      }

      /* Breakpoints Table */
      .breakpoints-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: get-spacing(md);

        th,
        td {
          padding: get-spacing(md);
          text-align: left;
          border-bottom: get-border-size(thin) solid get-border(standard);
        }

        th {
          background-color: get-background(secondary);
          font-weight: get-font-weight(bold);
        }

        tr:hover {
          background-color: get-background(secondary);
        }
      }

      /* Typography Showcase */
      .typography-showcase {
        display: flex;
        flex-direction: column;
        gap: get-gap(md);

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          margin: 0;
        }

        p, label, small {
          margin: 0;
        }

        label {
          @include typography-label;
          color: get-text(primary);
        }

        small {
          @include typography-caption;
          color: get-text(hint);
        }
      }

      /* Semantic Colors */
      .semantic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
        gap: get-gap(md);
      }

      .semantic-box {
        padding: get-spacing(md);
        border-radius: get-radius(md);
        color: get-text(on-primary);

        h3,
        p {
          margin: 0;
        }

        h3 {
          font-size: get-font-size(body-lg);
          margin-bottom: get-spacing(xs);
        }

        p {
          font-size: get-font-size(sm);
          opacity: 0.9;
        }
      }

      .semantic-primary {
        background-color: get-background(primary);
      }

      .semantic-success {
        background-color: get-background(success);
      }

      .semantic-warning {
        background-color: get-background(warning);
      }

      .semantic-danger {
        background-color: get-background(danger);
      }

      .semantic-info {
        background-color: get-background(info);
      }

      /* Spacing */
      .spacing-showcase {
        display: flex;
        flex-direction: column;
        gap: get-gap(xl);
      }

      .spacing-item {
        display: flex;
        align-items: center;
        gap: get-gap(md);
      }

      .spacing-name {
        width: 5rem;
        font-weight: get-font-weight(medium);
        text-align: right;
        font-size: get-font-size(sm);
      }

      .spacing-box {
        background-color: get-background(primary);
        border-radius: get-radius(xs);
        display: flex;
        align-items: center;
        justify-content: center;
        color: get-text(on-primary);
        font-size: get-font-size(xs);
        font-weight: get-font-weight(medium);
      }

      .spacing-value {
        font-family: $font-family-mono;
        font-size: get-font-size(sm);
        min-width: 5rem;
        color: get-text(secondary);
      }
    `,
  ],
})
class ThemingDemoComponent {
  colorPalette = [
    { name: 'Primary 500', value: '#0a5d8b' },
    { name: 'Green 500', value: '#009b0d' },
    { name: 'Orange 500', value: '#fa5c00' },
    { name: 'Red 500', value: '#eb0a1e' },
    { name: 'Yellow 500', value: '#fbd03b' },
    { name: 'Grey 50', value: '#f6f6f6' },
    { name: 'Grey 500', value: '#9e9e9e' },
    { name: 'Grey 900', value: '#212121' },
  ];

  breakpoints = [
    { name: 'xs', rem: '23.4375rem', px: '375px', device: 'Extra Small' },
    { name: 'sm', rem: '26.75rem', px: '428px', device: 'Small Phone' },
    { name: 'md', rem: '52.5rem', px: '840px', device: 'Tablet' },
    { name: 'lg', rem: '90rem', px: '1440px', device: 'Desktop' },
    { name: 'xl', rem: '120rem', px: '1920px', device: 'Wide Desktop' },
  ];

  spacingScale = [
    { name: 'xxs', value: 0.25, rem: '0.25rem', px: '4px' },
    { name: 'xs', value: 0.5, rem: '0.5rem', px: '8px' },
    { name: 'sm', value: 1, rem: '1rem', px: '16px' },
    { name: 'md', value: 1.5, rem: '1.5rem', px: '24px' },
    { name: 'lg', value: 2, rem: '2rem', px: '32px' },
    { name: 'xl', value: 3, rem: '3rem', px: '48px' },
    { name: 'xxl', value: 4, rem: '4rem', px: '64px' },
  ];
}

const meta: Meta<ThemingDemoComponent> = {
  title: 'Shared/Theming/Overview',
  component: ThemingDemoComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# GOM-UI Theming System

The theming system provides a complete design token infrastructure for the Global Order Management UI application.

## Features

- **Color System**: Comprehensive palette with semantic color mappings
- **Responsive Breakpoints**: Mobile-first responsive design utilities
- **Typography Scale**: Consistent font sizes, weights, and line heights
- **Spacing System**: Standardized padding, margin, and gap utilities
- **Dynamic Theme Switching**: Runtime theme changes via ThemeService

## Usage

### Import Theme in Components

\`\`\`scss
@use 'src/app/shared/theming/styles/theme' as *;

.my-component {
  color: get-text(primary);
  background: get-background(standard);
  padding: get-spacing(md);
  border-radius: get-radius(md);
  
  @include breakpoint-up(md) {
    padding: get-spacing(lg);
  }
}
\`\`\`

### Use ThemeService in Components

\`\`\`typescript
import { Component } from '@angular/core';
import { ThemeService } from 'src/app/shared/theming';

@Component({...})
export class MyComponent {
  constructor(private themeService: ThemeService) {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
\`\`\`

## CSS Variables

All theme values are exposed as CSS custom properties:

\`\`\`css
var(--color-primary)
var(--color-text-primary)
var(--color-bg-standard)
var(--spacing-md)
var(--radius-sm)
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ThemingDemoComponent>;

export const Overview: Story = {};

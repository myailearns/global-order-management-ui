# Remix Icons Integration Guide

## Overview
The application now uses **Remix Icons** library for all icon needs. Remix Icons provides 4800+ well-crafted open-source icons with a consistent design system.

## Installation
Remix Icons is already installed via npm:
```bash
npm install remixicon
```

## Global Integration
The Remix Icons CSS is imported globally in `src/styles.scss`:
```scss
@import "remixicon/fonts/remixicon.css";
```

## Usage

### Basic Icon Usage
Use the `<i>` tag with the icon class:
```html
<i class="ri-home-line"></i>
```

### Common Icons in GOM-UI

#### Pagination & Navigation
- **Previous**: `ri-arrow-left-s-line`
- **Next**: `ri-arrow-right-s-line`
- **Up**: `ri-arrow-up-s-line`
- **Down**: `ri-arrow-down-s-line`
- **Chevron Left**: `ri-chevron-left-line`
- **Chevron Right**: `ri-chevron-right-line`

#### Table Controls
- **Filter**: `ri-filter-line`
- **Settings (Column Toggle)**: `ri-list-settings-line`
- **Search**: `ri-search-line`
- **Sort Ascending**: `ri-arrow-up-s-line`
- **Sort Descending**: `ri-arrow-down-s-line`

#### Common Actions
- **Add/Plus**: `ri-add-line`
- **Delete**: `ri-delete-bin-line`
- **Edit**: `ri-pencil-line`
- **Save**: `ri-save-line`
- **Close/X**: `ri-close-line`
- **Menu**: `ri-menu-line`
- **More Options**: `ri-more-2-line`

#### Feedback & Status
- **Success/Checkmark**: `ri-check-line`
- **Error/X**: `ri-close-line`
- **Warning**: `ri-alert-line`
- **Info**: `ri-information-line`
- **Loading**: `ri-loader-4-line` (use with animation)

### Styling Icons

#### Size
Control size via `font-size`:
```scss
i.icon-small { font-size: 0.875rem; }
i.icon-medium { font-size: 1.25rem; }
i.icon-large { font-size: 1.5rem; }
```

#### Color
Use `color` property:
```scss
i { color: theme.get-text(primary); }
```

#### Animation
Add animations using SCSS transitions:
```scss
i {
  transition: transform 200ms ease;
  
  &:hover {
    transform: rotate(180deg);
  }
}
```

### In Angular Templates

#### With Button Component
```html
<gom-button (buttonClick)="onDelete()" variant="danger" size="icon">
  <i class="ri-delete-bin-line" aria-hidden="true"></i>
</gom-button>
```

#### With Accessibility
Always add `aria-hidden="true"` for decorative icons:
```html
<i class="ri-arrow-right-s-line" aria-hidden="true"></i>
```

For functional icons, provide `aria-label`:
```html
<i class="ri-search-line" aria-label="Search"></i>
```

### Finding Icons
Visit [Remix Icon Library](https://remixicon.com/) to browse all available icons and copy their class names.

## Current Usage in GOM-UI

### Table Component
- **Pagination buttons**: `ri-arrow-left-s-line`, `ri-arrow-right-s-line`
- **Sort indicators**: `ri-arrow-up-s-line`, `ri-arrow-down-s-line`
- **Filter button**: `ri-filter-line`
- **Column toggle**: `ri-list-settings-line`

### Group Wizard Modal
Consider adding icons to wizard step headers for better UX:
- Add: `ri-add-line`
- Product: `ri-box-3-line`
- Details: `ri-file-text-line`
- Review: `ri-checkbox-circle-line`

### Form Controls
Ready to use icons for:
- Success messages: `ri-check-circle-line`
- Error messages: `ri-alert-circle-line`
- Info states: `ri-information-line`

## Best Practices
1. Use consistent icon sizes within component families
2. Always provide accessibility labels for important icons
3. Use filled versions (`-fill`) for active/selected states
4. Use line versions (`-line`) for navigation and inactive states
5. Cache the icon set locally to avoid external dependencies
6. Test icon rendering on different screen sizes

## Icon Naming Convention
Remix Icons follow a naming pattern:
- `ri-[icon-name]-line` - Outlined style
- `ri-[icon-name]-fill` - Filled style

Choose based on visual hierarchy and context.

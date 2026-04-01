# Copilot Instructions – Order Management App

## Tech Stack
- Angular
- Tailwind CSS
- Angular Material
- localStorage

## General Rules
- Use standalone components
- Use Reactive Forms only
- Use FormArray for items
- No any type
- Keep code simple and clean
- dont add too much comments, code should be self-explanatory

## File Usage Rules (IMPORTANT)
- For models → refer /docs/data-model.md
- For coding rules → refer /docs/dev-rules.md
- For architecture → refer /docs/architecture.md
- For API → refer /docs/api-future.md

## Order Rules
- One order → multiple items
- Items support add/remove/edit
- Store in localStorage

## Table
- Custom table (no AG Grid)
- Support filter, sort, grouping (manual)

## Status
NEW, ASSIGNED, DELIVERED, CANCELLED

## Features
- Order CRUD
- Product CRUD
- Assign delivery
- Multi select + share
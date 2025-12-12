# Archive Directory

This directory contains legacy code that has been replaced by the new `@/core/*` structure.

## Contents

### `lib/`
Legacy `src/lib/*` files that have been migrated to `src/core/*`:

- **auth/** - Authentication and permission modules → `src/core/auth` and `src/core/permissions`
- **supabase/** - Database client and utilities → `src/core/database`
- **stripe/** - Billing configuration → `src/core/billing`
- **tenant/** - Multi-tenancy utilities → `src/core/multi-tenancy`
- **workspace/** - Workspace management → `src/core/multi-tenancy`

## Migration Status

All application code, components, and scripts have been migrated to use `@/core/*` imports.

These files are kept for reference only and should **NOT** be imported or used in new code.

## When to Remove

These files can be safely deleted after:
1. Confirming all code uses `@/core/*` imports
2. Verifying no external dependencies reference these files
3. Ensuring migration documentation is complete

## Migration Guide

See `docs/CORE_REORGANIZATION_SUMMARY.md` for details on the new structure.



# Verification Checklist

Use this checklist before saying a module-platform change is complete.

## Static Verification

- `npm run typecheck`
- relevant unit tests
- route/action guard search
- no new tenant/client conditionals
- no new hardcoded shell nav
- no new vertical dashboard switch

## Runtime/Behavior Verification

- module enabled path works,
- module disabled route blocks,
- module disabled action blocks,
- user without permission is denied,
- data remains after disable,
- tenant A cannot access tenant B data,
- blank tenant has no business module UI.

## Documentation Verification

- docs state current status accurately,
- target docs are not written as shipped facts,
- client implementation docs do not redefine platform architecture,
- VEDA-specific behavior is classified.

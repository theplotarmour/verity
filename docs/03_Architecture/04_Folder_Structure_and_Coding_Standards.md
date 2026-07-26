# Folder Structure And Coding Standards

## Source Structure

- `src/app`: route surfaces and route-local clients
- `src/server/actions`: domain actions
- `src/lib`: shared utilities, storage, auth, prisma, types
- `src/components`: UI system and role-specific components
- `prisma`: schema, migrations, seed
- `scripts`: operational scripts and generators
- `docs`: canonical product authority

## Documentation Rules

- docs must be specific enough to drive implementation
- each canonical file must own one clear concept
- implementation should cite the relevant doc during major feature work
- deprecated ideas should be removed rather than left ambiguous

## Code Standards Direction

- business logic belongs in engines and action layers, not scattered through view code
- route surfaces should stay role-specific
- naming should favor operational clarity over generic SaaS vocabulary
- design tokens and semantic UI rules must be preserved

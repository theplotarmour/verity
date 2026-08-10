/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * The real package exports a module that throws when resolved outside a server
 * environment. That is the correct behaviour for a bundler and the wrong one for
 * a test runner, which has no client bundle to protect.
 *
 * Aliased in `vitest.config.ts`. Next's build still enforces the real thing.
 */
export {};

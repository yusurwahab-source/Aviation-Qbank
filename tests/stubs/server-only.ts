/**
 * Stands in for the `server-only` package under Vitest.
 *
 * The real package throws on import outside a React Server Component, which is
 * exactly what it is for. Tests run in plain Node, so it is aliased to this
 * empty module in `vitest.config.mts`.
 */
export {};

/**
 * Reading configuration out of the environment.
 *
 * Pure and unit tested: `readEnv` takes the raw value rather than reaching
 * into `process.env` itself, so every shape it has to tolerate can be
 * asserted directly.
 *
 * It tolerates three things, all of them real ways a correct value arrives
 * wrong when somebody pastes it into a hosting dashboard rather than writing
 * a `.env` file:
 *
 * 1. **Surrounding whitespace.** A trailing newline or space is invisible in
 *    the form field and fatal to an API key.
 * 2. **The whole `.env` line.** `STRIPE_SECRET_KEY=sk_test_…` pasted into a
 *    box that wanted only `sk_test_…`. This one is not hypothetical: it is
 *    what broke the first live checkout on this project, and the provider's
 *    error — "Invalid API Key provided: STRIPE_S…" — named the variable
 *    rather than the key, because the variable name *was* the key it got.
 * 3. **Quotes carried over from a `.env` file.** `"sk_test_…"` with the
 *    quotes included in the value.
 *
 * None of this makes a wrong value right: a key for the wrong account, or a
 * truncated one, still fails at the provider. It only stops a value that is
 * *correct* from failing because of how it was transported.
 */

/** Variable names are plain words today; escaping keeps that an assumption, not a bug. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The configured value for `name`, or null when it is unset or empty.
 *
 * `raw` is passed in rather than read here so this stays a pure function;
 * `envValue` below is the one that touches `process.env`.
 */
export function readEnv(name: string, raw: string | undefined): string | null {
  if (raw === undefined) return null;

  let value = raw.trim();
  if (value === "") return null;

  // "NAME=value" — a whole .env line pasted into a value-only field. The
  // spacing is whatever the pasted line had, so `NAME = value` counts too.
  const assignment = new RegExp(`^${escapeForRegExp(name)}\\s*=`, "i");
  if (assignment.test(value)) {
    value = value.replace(assignment, "").trim();
  }

  // "value" or 'value' — quotes a .env file needs and a dashboard does not.
  const first = value[0];
  const last = value[value.length - 1];
  if (value.length >= 2 && (first === '"' || first === "'") && last === first) {
    value = value.slice(1, -1).trim();
  }

  return value === "" ? null : value;
}

/** `readEnv` against the live environment. The only impure part of this file. */
export function envValue(name: string): string | null {
  return readEnv(name, process.env[name]);
}

/**
 * What a keystroke means during a test, decided as data rather than inside
 * the component that listens for it — the same reasoning `question-status.ts`
 * gives for keeping the exam-mode reveal rule in its own pure module: logic
 * that is easy to get right in a keyboard handler and easy to break in a
 * later refactor is worth being able to assert directly.
 */

/**
 * Which option a key picks, if any. `1`-`9` and `a`-`z`/`A`-`Z` both work,
 * so a five-option question is reachable as `1`-`5` or `A`-`E` alike — the
 * shortcut hint only ever needs to show one form because both always agree.
 */
export function optionIndexForKey(key: string): number | null {
  if (/^[1-9]$/.test(key)) return Number(key) - 1;
  if (/^[a-zA-Z]$/.test(key)) return key.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
  return null;
}

/**
 * Whether a keystroke should be treated as a shortcut at all.
 *
 * Three things rule it out: a modifier held (so Ctrl+F, Cmd+R and friends
 * keep meaning what the browser already gives them), and focus sitting
 * inside a field where the letter or digit is plainly meant as *text* —
 * typing "f" into the note editor must never flag the question out from
 * under the cursor.
 */
export function shouldHandleShortcut(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
}): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;

  const tag = event.target?.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  if (event.target?.isContentEditable) return false;

  return true;
}

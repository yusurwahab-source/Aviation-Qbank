/**
 * Pure drag-gesture math for a draggable, dismissible bottom sheet
 * (`ExplanationSheet`). Kept here, tested on its own, rather than inline in
 * the component's pointer handlers — the same split `keyboard-shortcuts.ts`
 * and `question-status.ts` already draw between a rule a component leans on
 * and the React wiring around it.
 */

/**
 * How far down, in pixels, a drag has to travel before letting go counts as
 * "dismiss this sheet" rather than "snap back open". A fixed pixel figure
 * rather than a fraction of the sheet's own height: the sheet's height
 * varies with how long an explanation is, and a short explanation should
 * not need a correspondingly shorter drag to dismiss it.
 */
export const DISMISS_THRESHOLD_PX = 90;

/**
 * A sheet already fully open has nowhere further up to go — only down,
 * toward dismissal. Clamps an upward drag to no movement at all, rather
 * than letting the sheet overshoot above its own resting position.
 */
export function clampDragOffset(deltaY: number): number {
  return Math.max(0, deltaY);
}

/** Whether releasing the drag at this offset should dismiss the sheet. */
export function shouldDismissDrag(dragY: number): boolean {
  return dragY > DISMISS_THRESHOLD_PX;
}

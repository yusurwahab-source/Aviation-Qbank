import { redirect } from "next/navigation";

/**
 * `/aircraft` was the Type Rating picker before this area was split into
 * three sections (`CLAUDE.md`, "many aircraft" → "three sections"). Kept as
 * a permanent redirect so a bookmarked or shared link still lands somewhere
 * real.
 */
export default function LegacyAircraftPickerRedirect() {
  redirect("/type-rating");
}

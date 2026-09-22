import { redirect } from "next/navigation";

/** `/class` → `/class-rating`, kept for any link minted before the rename. */
export default function LegacyClassPickerRedirect() {
  redirect("/class-rating");
}

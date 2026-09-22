import { redirect } from "next/navigation";

/** `/aviation-knowledge` → `/flying-knowledge`. The third section was named
 * "Aviation Knowledge" for one deploy before the owner settled on "Flying
 * Knowledge" — kept as a redirect in case the earlier name was ever shared. */
export default function LegacyAviationKnowledgeRedirect() {
  redirect("/flying-knowledge");
}

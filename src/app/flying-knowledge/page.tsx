import { redirect } from "next/navigation";

/** `/flying-knowledge` → `/atpl-ground-school`. The subject picker moved to the
 * EASA ATPL Ground School page; each subject's own pages stay under
 * `/flying-knowledge/<code>`. */
export default function FlyingKnowledgePickerRedirect() {
  redirect("/atpl-ground-school");
}

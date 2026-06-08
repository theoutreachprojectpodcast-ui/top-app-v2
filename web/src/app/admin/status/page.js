import { redirect } from "next/navigation";

/** QA status moved under Advanced; keep legacy URL working. */
export default function AdminStatusRedirectPage() {
  redirect("/admin/advanced");
}

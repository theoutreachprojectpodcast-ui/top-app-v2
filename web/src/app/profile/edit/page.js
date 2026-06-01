import { redirect } from "next/navigation";

/** Deep-link helper: `/profile/edit?field=phone` → `/profile?edit=1&field=phone` */
export default async function ProfileEditRedirectPage({ searchParams }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("edit", "1");
  const field = sp?.field != null ? String(sp.field).trim() : "";
  const section = sp?.section != null ? String(sp.section).trim() : "";
  const focus = sp?.focus != null ? String(sp.focus).trim() : "";
  if (field) q.set("field", field);
  if (section) q.set("section", section);
  if (focus) q.set("focus", focus);
  redirect(`/profile?${q.toString()}`);
}

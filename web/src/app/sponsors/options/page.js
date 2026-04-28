import { redirect } from "next/navigation";

export default async function SponsorsOptionsRedirectRoute({ searchParams }) {
  const sp = await searchParams;
  const next = new URLSearchParams();

  if (sp?.apply === "1") {
    next.set("apply", "1");
    if (sp?.tier) next.set("tier", String(sp.tier));
    redirect(`/sponsors?${next.toString()}`);
  }

  next.set("packages", "1");
  if (sp?.tier) next.set("tier", String(sp.tier));
  redirect(`/sponsors?${next.toString()}`);
}

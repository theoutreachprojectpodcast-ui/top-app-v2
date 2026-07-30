import Link from "next/link";
import AdminHomepagePanel from "@/features/admin/AdminHomepagePanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import AdminSectionCard from "@/components/admin/AdminSectionCard";

const CONTENT_DESTINATIONS = [
  {
    href: "/admin/community",
    label: "Community",
    desc: "Create posts, moderate the feed, and pin featured stories.",
  },
  {
    href: "/admin/sponsors",
    label: "Sponsors",
    desc: "Edit branding, offers, visibility, and featured flags.",
  },
  {
    href: "/admin/trusted",
    label: "Trusted Resources",
    desc: "Partner listings members use for real-world help.",
  },
  {
    href: "/admin/podcasts",
    label: "Podcasts",
    desc: "Episodes, guests, and show media.",
  },
  {
    href: "/admin/nonprofits",
    label: "Nonprofit Directory",
    desc: "Enrichment, categories, and header images.",
  },
  {
    href: "/admin/content/blocks",
    label: "Page blocks",
    desc: "Reusable copy for about, footer, and membership pages.",
  },
  {
    href: "/admin/images",
    label: "Images & banners",
    desc: "Section backgrounds and page imagery.",
  },
  {
    href: "/admin/media-library",
    label: "Media library",
    desc: "Upload assets and copy URLs into editors.",
  },
];

export default function AdminContentPage() {
  return (
    <>
      <AdminPanelShell
        panelId="homepage"
        title="Home"
        description="Controls the public homepage: featured sponsors, hub cards, and related content destinations."
        status="live"
        primaryAction={
          <Link className="btnPrimary" href="/admin/content/create">
            Create content
          </Link>
        }
      >
        <AdminSectionCard
          title="Edit related areas"
          description="Jump to the live surfaces this homepage links into."
        >
          <div className="adminTaskGrid">
            {CONTENT_DESTINATIONS.map((item) => (
              <Link key={item.href} className="adminTaskCard" href={item.href}>
                <strong>{item.label}</strong>
                <span className="adminMuted">{item.desc}</span>
              </Link>
            ))}
          </div>
        </AdminSectionCard>
      </AdminPanelShell>
      <AdminHomepagePanel />
    </>
  );
}

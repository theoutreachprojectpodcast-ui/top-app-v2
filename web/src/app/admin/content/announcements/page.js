import AdminScopeBanner from "@/components/admin/AdminScopeBanner";

export default function AdminAnnouncementsPage() {
  return (
    <div className="adminPanel">
      <h1 style={{ marginTop: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Site announcements
      </h1>
      <AdminScopeBanner readiness="placeholder" title="Module planned">
        Global announcement banners and dismissible site notices will live here. Use Community staff posts or homepage
        settings for interim messaging.
      </AdminScopeBanner>
    </div>
  );
}

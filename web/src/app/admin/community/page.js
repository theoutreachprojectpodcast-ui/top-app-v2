import AdminCommunityPanel from "@/features/admin/AdminCommunityPanel";
import AdminCommunityPostsSection from "@/features/admin/AdminCommunityPostsSection";

export default function AdminCommunityPage() {
  return (
    <>
      <AdminCommunityPostsSection />
      <hr className="adminRule" style={{ margin: "32px 0" }} />
      <AdminCommunityPanel />
    </>
  );
}

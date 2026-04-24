"use client";

import { useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import PodcastGuestApplicationsAdmin from "@/features/podcasts/components/PodcastGuestApplicationsAdmin";

export default function AdminPodcastsPanel() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  return (
    <div className="adminPanel">
      <h2 style={{ marginTop: 0 }}>Podcasts</h2>
      <p className="adminMuted">
        Guest application review is admin-only and removed from the public podcasts page.
      </p>
      <PodcastGuestApplicationsAdmin supabase={supabase} />
    </div>
  );
}

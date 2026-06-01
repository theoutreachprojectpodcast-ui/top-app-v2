"use client";

import Link from "next/link";
import CommunityPostMedia from "@/features/community/components/CommunityPostMedia";

/**
 * @param {{ resource: { name?: string, category?: string, description?: string, image?: string, logo?: string, href?: string } }}
 */
export default function CommunityPostResourceBlock({ resource }) {
  if (!resource?.name) return null;
  const href = String(resource.href || "/trusted").trim() || "/trusted";
  const hero = String(resource.image || resource.logo || "/home/home-trusted-mountain.png").trim();

  return (
    <Link className="communityPostResource" href={href}>
      <CommunityPostMedia
        src={hero}
        alt={resource.name ? `${resource.name} resource` : "Trusted resource"}
        className="communityPostMedia--resource"
      />
      <div className="communityPostResourceCopy">
        {resource.category ? <span className="communityPostResourceCategory">{resource.category}</span> : null}
        <h5 className="communityPostResourceName">{resource.name}</h5>
        {resource.description ? <p className="communityPostResourceDesc">{resource.description}</p> : null}
        <span className="communityPostResourceLink">View resource →</span>
      </div>
    </Link>
  );
}

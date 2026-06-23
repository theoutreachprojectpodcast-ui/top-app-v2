import { Globe, Instagram, Youtube, Linkedin, Facebook, Twitter, Video, Mail } from "lucide-react";

const ICONS = {
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Video,
  email: Mail,
};

export default function NonprofitSocialLinks({ links = [], className = "" }) {
  if (!links.length) return null;
  const wrapClass = ["nonprofitSocialLinks", className].filter(Boolean).join(" ");
  return (
    <div className={wrapClass} aria-label="Organization links">
      {links.map((link) => {
        const Icon = ICONS[link.type] || Globe;
        const isMail = /^mailto:/i.test(String(link.url || ""));
        return (
          <a
            key={`${link.type}-${link.url}`}
            className="nonprofitSocialLink"
            data-top-card-interactive
            href={link.url}
            target={isMail ? undefined : "_blank"}
            rel={isMail ? undefined : "noopener noreferrer"}
            aria-label={link.label}
            title={link.label}
          >
            <Icon size={15} strokeWidth={2} aria-hidden />
          </a>
        );
      })}
    </div>
  );
}

import { Globe, Instagram, Youtube, Linkedin, Facebook, Twitter } from "lucide-react";

const ICONS = {
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  x: Twitter,
};

export default function NonprofitSocialLinks({ links = [] }) {
  if (!links.length) return null;
  return (
    <div className="nonprofitSocialLinks" aria-label="Organization links">
      {links.map((link) => {
        const Icon = ICONS[link.type] || Globe;
        return (
          <a
            key={`${link.type}-${link.url}`}
            className="nonprofitSocialLink"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
          >
            <Icon size={15} strokeWidth={2} />
          </a>
        );
      })}
    </div>
  );
}

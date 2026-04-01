import Image from "next/image";

const SIZE_MAP = {
  header: 235,
  profile: 44,
};

export default function BrandMark({ size = "header", className = "", alt = "The Outreach Project brand logo" }) {
  const px = SIZE_MAP[size] || SIZE_MAP.header;
  return (
    <div className={`brandMark brandMark-${size} ${className}`.trim()} style={{ width: px, height: px }}>
      <Image src="/assets/op-logo-silver.png" alt={alt} fill sizes={`${px}px`} className="brandMarkImg" priority={size === "header"} />
    </div>
  );
}

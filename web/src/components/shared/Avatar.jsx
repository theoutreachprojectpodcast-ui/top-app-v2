import Image from "next/image";

export default function Avatar({ src, alt = "Profile avatar", className = "", sizes = "80px" }) {
  const value = String(src || "").trim();
  const isLocalAsset = value.startsWith("/");
  /** Next/Image localPatterns do not allow query strings on src. */
  const localSrc = isLocalAsset ? value.split("?")[0].split("#")[0] : value;
  return (
    <div className={`profileAvatarShell ${className}`.trim()}>
      {isLocalAsset ? (
        <Image src={localSrc} alt={alt} fill sizes={sizes} className="profileAvatarImg" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={alt} className="profileAvatarImg" />
      )}
    </div>
  );
}

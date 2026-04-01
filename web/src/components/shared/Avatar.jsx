import Image from "next/image";

export default function Avatar({ src, alt = "Profile avatar", className = "" }) {
  const value = String(src || "").trim();
  const isLocalAsset = value.startsWith("/");
  return (
    <div className={`profileAvatarShell ${className}`.trim()}>
      {isLocalAsset ? (
        <Image src={value} alt={alt} fill sizes="80px" className="profileAvatarImg" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={alt} className="profileAvatarImg" />
      )}
    </div>
  );
}

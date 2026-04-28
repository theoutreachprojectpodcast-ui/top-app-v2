const MIN_IMAGE_BYTES = Number(process.env.LOGO_MIN_IMAGE_BYTES || 256);

async function isValidImageUrl(url) {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!head.ok) return false;
    const contentType = String(head.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("image")) return false;
    const length = Number(head.headers.get("content-length") || 0);
    if (length && length < MIN_IMAGE_BYTES) return false;
    return true;
  } catch {
    try {
      const getRes = await fetch(url, { method: "GET", redirect: "follow" });
      if (!getRes.ok) return false;
      const contentType = String(getRes.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("image")) return false;
      const buff = await getRes.arrayBuffer();
      return buff.byteLength >= MIN_IMAGE_BYTES;
    } catch {
      return false;
    }
  }
}

async function isLikelyWebsite(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) return false;
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    return contentType.includes("text/html");
  } catch {
    return false;
  }
}

module.exports = {
  isLikelyWebsite,
  isValidImageUrl,
};

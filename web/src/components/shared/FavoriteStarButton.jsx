"use client";

/**
 * Design-system favorite star (★/☆) shared by nonprofit + trusted resource surfaces.
 * Uses `.favBtn` tokens from top-app.css — do not introduce one-off icon libraries here.
 */
export default function FavoriteStarButton({
  isFavorite = false,
  busy = false,
  favoritesEnabled = false,
  onToggle,
  onRequestSignIn,
  className = "",
  labeled = false,
  block = false,
  savedLabel = "Saved",
  unsavedLabel = "Save",
  organizationName = "",
}) {
  const nameHint = String(organizationName || "").trim();
  const ariaSave = nameHint ? `Save ${nameHint}` : "Save organization";
  const ariaRemove = nameHint ? `Remove ${nameHint} from saved` : "Remove from saved";
  const ariaGuest = nameHint ? `Sign in to save ${nameHint}` : "Sign in to save organizations";

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onClick(event) {
    stop(event);
    if (busy) return;
    if (favoritesEnabled && onToggle) {
      onToggle();
      return;
    }
    if (onRequestSignIn) onRequestSignIn();
  }

  if (!favoritesEnabled && !onRequestSignIn) return null;

  const classes = [
    "favBtn",
    isFavorite ? "favBtn--on" : "",
    !favoritesEnabled && onRequestSignIn ? "favBtn--muted" : "",
    labeled ? "favBtn--labeled" : "",
    block ? "favBtn--block" : "",
    busy ? "favBtn--busy" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      data-top-card-interactive
      onClick={onClick}
      disabled={busy}
      aria-pressed={favoritesEnabled ? !!isFavorite : undefined}
      aria-busy={busy || undefined}
      aria-label={favoritesEnabled ? (isFavorite ? ariaRemove : ariaSave) : ariaGuest}
    >
      <span className="favBtn__glyph" aria-hidden="true">
        {isFavorite ? "★" : "☆"}
      </span>
      {labeled ? (
        <span className="favBtn__text">{isFavorite ? savedLabel : unsavedLabel}</span>
      ) : null}
    </button>
  );
}

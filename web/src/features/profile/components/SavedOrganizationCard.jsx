import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";

export default function SavedOrganizationCard({ card, onToggleFavorite }) {
  if (!card?.name) return null;

  return (
    <NonprofitCard
      card={card}
      actionMode="saved"
      favoritesEnabled={true}
      isFavorite={true}
      onToggleFavorite={onToggleFavorite}
    />
  );
}

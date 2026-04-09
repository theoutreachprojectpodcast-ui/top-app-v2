import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";

export default function SavedOrganizationCard({ organization, onToggleFavorite }) {
  const card = mapNonprofitCardRow(organization, "saved");
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

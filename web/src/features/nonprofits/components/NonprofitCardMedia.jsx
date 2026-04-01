import NonprofitAvatar from "@/features/nonprofits/components/NonprofitAvatar";

export default function NonprofitCardMedia({ category, tier, categoryLabel }) {
  return (
    <div className="nonprofitCardMedia">
      <NonprofitAvatar category={category} tier={tier} categoryLabel={categoryLabel} />
    </div>
  );
}

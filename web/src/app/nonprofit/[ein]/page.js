import NonprofitProfilePage from "@/features/nonprofits/components/NonprofitProfilePage";

export default async function NonprofitDetailRoute({ params }) {
  const { ein } = await params;
  return <NonprofitProfilePage ein={ein} />;
}

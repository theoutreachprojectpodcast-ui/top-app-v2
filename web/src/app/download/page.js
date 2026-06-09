import Link from "next/link";
import DownloadMobileAppButton from "@/components/layout/DownloadMobileAppButton";
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  hasPublishedStoreLinks,
} from "@/lib/runtime/mobileStoreLinks";

export const metadata = {
  title: "Mobile app — The Outreach Project",
  description: "Download The Outreach Project for iOS and Android.",
};

export default function DownloadMobileAppPage() {
  const storesLive = hasPublishedStoreLinks();

  return (
    <main className="shell legalPageRoute">
      <section className="panel legalPage mobileAppLanding">
        <h1>The Outreach Project mobile app</h1>
        <p>
          Browse trusted resources, community stories, podcasts, and your profile on iOS and Android.
          Sign in with the same WorkOS account you use on the web; membership and billing stay on{" "}
          <strong>theoutreachproject.app</strong>.
        </p>

        <div className="row wrap mobileAppLanding__actions">
          <DownloadMobileAppButton className="btnPrimary downloadMobileAppBtn" />
          {IOS_APP_STORE_URL ? (
            <a className="btnSoft" href={IOS_APP_STORE_URL} target="_blank" rel="noopener noreferrer">
              App Store
            </a>
          ) : null}
          {ANDROID_PLAY_STORE_URL ? (
            <a className="btnSoft" href={ANDROID_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
              Google Play
            </a>
          ) : null}
        </div>

        {!storesLive ? (
          <p className="sponsorSectionLead" role="status">
            Store links will appear here when the app is approved on the App Store and Google Play.
            Bundle ID: <code>org.theoutreachproject.torp</code>
          </p>
        ) : null}

        <p className="sponsorSectionLead">
          <Link href="/">Back to home</Link>
        </p>
      </section>
    </main>
  );
}

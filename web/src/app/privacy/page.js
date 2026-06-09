export const metadata = {
  title: "Privacy Policy — The Outreach Project",
  description: "How The Outreach Project collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="legalPageRoute">
      <section className="panel legalPage">
        <h1>Privacy Policy</h1>
        <p className="legalPageMeta">Last updated: June 8, 2026</p>
        <p>
          The Outreach Project (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;TOP&rdquo;) provides a resource network for
          veterans, first responders, and supporters. This policy describes how we handle information when you use our
          website and mobile apps (Apple App Store and Google Play) at <strong>theoutreachproject.app</strong>.
        </p>
        <p>
          Our iOS and Android apps load the same secure web application in an in-app browser. Data practices are largely
          the same on web and mobile.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account information</strong> — name, email, and profile details you provide when you sign in or
            complete onboarding (authentication is handled by WorkOS).
          </li>
          <li>
            <strong>Usage and content</strong> — community posts, saved organizations, favorites, and similar in-app
            activity you choose to create.
          </li>
          <li>
            <strong>Payment information</strong> — membership and sponsor checkout are processed by Stripe. We store
            billing status and customer references; we do not store full card numbers on our servers.
          </li>
          <li>
            <strong>Contact submissions</strong> — messages you send through our contact form.
          </li>
          <li>
            <strong>Technical data</strong> — standard server and security logs (IP address, browser or app user agent,
            timestamps) needed to operate and protect the service.
          </li>
          <li>
            <strong>Device permissions (mobile)</strong> — if you choose to upload a photo, the app may request camera
            or photo library access only at that moment. We do not collect precise location or advertising identifiers for
            cross-app tracking.
          </li>
        </ul>

        <h2>Mobile apps &amp; payments</h2>
        <p>
          Membership checkout uses <strong>Stripe</strong> on the web (including from the mobile apps). We do not use Apple
          In-App Purchase or Google Play Billing for membership tiers. We do not sell your personal information.
        </p>

        <h2>How we use information</h2>
        <ul>
          <li>Provide sign-in, profiles, directory search, community features, and membership benefits.</li>
          <li>Process payments and maintain subscription status.</li>
          <li>Respond to contact and application submissions.</li>
          <li>Improve reliability, security, and support.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2>Sharing</h2>
        <p>
          We use service providers that process data on our behalf (for example Supabase for data storage, WorkOS for
          authentication, Stripe for payments, and Vercel for hosting). We do not sell your personal information. We
          may disclose information if required by law or to protect users and the platform.
        </p>

        <h2>Retention &amp; security</h2>
        <p>
          We retain account and content data while your account is active and as needed for legal, billing, and
          operational purposes. We apply access controls, encryption in transit (HTTPS), and industry-standard hosting
          practices. No method of transmission or storage is 100% secure.
        </p>

        <h2>Your choices</h2>
        <p>
          You may update profile information in the app, sign out at any time, or contact us to request account-related
          assistance. Membership billing can be managed through Stripe Customer Portal where enabled.
        </p>

        <h2>Children</h2>
        <p>The service is not directed to children under 13, and we do not knowingly collect their information.</p>

        <h2>Changes</h2>
        <p>
          We may update this policy. Material changes will be reflected on this page with an updated date. Continued use
          after changes means you accept the revised policy.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy: use our <a href="/contact">contact form</a> or write to the support address listed in
          the App Store / Google Play listing.
        </p>
      </section>
    </div>
  );
}

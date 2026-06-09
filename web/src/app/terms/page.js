export const metadata = {
  title: "Terms of Use — The Outreach Project",
  description: "Terms governing use of The Outreach Project website and mobile apps.",
};

export default function TermsPage() {
  return (
    <div className="legalPageRoute">
      <section className="panel legalPage">
        <h1>Terms of Use</h1>
        <p className="legalPageMeta">Last updated: June 8, 2026</p>
        <p>
          By accessing or using The Outreach Project (&ldquo;TOP,&rdquo; &ldquo;we,&rdquo; or &ldquo;the service&rdquo;)
          at <strong>theoutreachproject.app</strong> or through our mobile apps (Apple App Store and Google Play), you
          agree to these Terms of Use.
        </p>

        <h2>The service</h2>
        <p>
          TOP helps users discover nonprofit resources, trusted partners, community content, podcasts, and membership
          benefits. Directory and enrichment data may come from public sources and third parties; we strive for accuracy
          but do not guarantee completeness.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for your account credentials and activity under your account. Sign-in is provided through
          our authentication partner (WorkOS). You must provide accurate information and keep it updated.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not harass, impersonate, or post unlawful or harmful content in community areas.</li>
          <li>Do not attempt to disrupt, scrape, or reverse engineer the service without permission.</li>
          <li>Respect intellectual property and the privacy of others.</li>
        </ul>

        <h2>Membership &amp; payments</h2>
        <p>
          Paid memberships are billed through <strong>Stripe</strong> under the terms shown at checkout. We do not use
          Apple In-App Purchase or Google Play Billing for membership subscriptions at this time. Fees, renewal, and
          cancellation follow Stripe and the plan you select. Refunds are handled according to our posted policies and
          applicable law.
        </p>

        <h2>Mobile apps (Apple &amp; Google)</h2>
        <p>
          If you obtained the app through the Apple App Store or Google Play, additional platform terms in our full Terms
          and Conditions apply (Apple is not a party to your agreement with TOP; Google is not responsible for the app).
          Most product updates ship through our web deployment at theoutreachproject.app.
        </p>

        <h2>User content</h2>
        <p>
          You retain ownership of content you submit. You grant TOP a license to host, display, and operate that content
          as needed to run the service. We may remove content that violates these terms or applicable law.
        </p>

        <h2>Disclaimer</h2>
        <p>
          The service is provided &ldquo;as is.&rdquo; TOP is not a substitute for professional medical, legal, or
          emergency services. Resource listings are informational; verify details with the organization directly.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, TOP and its operators are not liable for indirect, incidental, or
          consequential damages arising from use of the service.
        </p>

        <h2>Changes &amp; termination</h2>
        <p>
          We may modify these terms or suspend access for violations or maintenance. Continued use after changes
          constitutes acceptance. You may stop using the service at any time.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: use our <a href="/contact">contact form</a>.
        </p>
        <p>
          See also our <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>
    </div>
  );
}

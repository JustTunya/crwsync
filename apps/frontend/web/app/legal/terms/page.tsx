import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/legal/terms" },
  description: "The terms governing use of the crwsync demo platform: accounts, acceptable use, workspace content, and the limits of a portfolio project.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" lastUpdated="September 14, 2026">
      <LegalSection heading="1. Acceptance of Terms">
        <p>
          By creating an account or otherwise using crwsync (the &quot;Service&quot;), you agree to these Terms of
          Service. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. What crwsync Is">
        <p>
          crwsync is a portfolio project built to demonstrate a production-shaped, real-time collaboration platform:
          workspaces, Kanban boards, chat, files, and notifications, all backed by a real database, real
          authentication, and a real WebSocket layer. It is not operated as a commercial product, carries no uptime
          guarantee, and may be reset or taken offline without notice.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts &amp; Eligibility">
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 13 years old to create an account.</li>
          <li>You are responsible for the security of your password and for all activity under your account.</li>
          <li>You must provide accurate account information and keep it up to date.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Acceptable Use">
        <p>You agree not to use crwsync to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload unlawful, infringing, or malicious content (including malware or executable payloads).</li>
          <li>Attempt to disrupt, overload, or gain unauthorized access to the Service or other accounts.</li>
          <li>Harass, impersonate, or violate the rights of other users or third parties.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Your Content">
        <p>
          You retain ownership of the tasks, messages, files, and other content you create in your workspaces
          (&quot;Your Content&quot;). You grant crwsync a limited license to store, process, and transmit Your
          Content solely to operate the Service — for example, syncing a task update to your teammates in real
          time.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data Export &amp; Deletion">
        <p>
          You can download a copy of your account and activity data, or permanently close your account, at any time
          from <span className="text-foreground font-medium">Account Settings → Privacy</span> in the dashboard. See
          our <a href="/legal/privacy" className="text-accent underline underline-offset-2">Privacy Policy</a> for
          details on what closing an account does to shared content.
        </p>
      </LegalSection>

      <LegalSection heading="7. Termination">
        <p>
          You may stop using the Service and close your account at any time. We may suspend or remove accounts that
          violate these Terms or that abuse the Service&apos;s infrastructure.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimer &amp; Limitation of Liability">
        <p>
          The Service is provided &quot;as is,&quot; without warranties of any kind, as a demonstration project. To
          the fullest extent permitted by law, the author is not liable for any damages arising from use of the
          Service, including loss of data.
        </p>
      </LegalSection>

      <LegalSection heading="9. Source &amp; License">
        <p>
          crwsync&apos;s source is public for reading, study, and personal or educational use under the PolyForm
          Noncommercial 1.0.0 license. Commercial use requires a separate license from the author.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after a change constitutes
          acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these Terms can be sent to{" "}
          <a href="mailto:support@crwsync.xyz" className="text-accent underline underline-offset-2">
            support@crwsync.xyz
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

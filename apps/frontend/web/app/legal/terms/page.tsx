import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { contactEmail } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/legal/terms" },
  description: "The terms governing use of crwsync: accounts, acceptable use, workspace content, optional AI features, and the limits of an early-access service.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" lastUpdated="October 8, 2026">
      <LegalSection heading="1. Acceptance of Terms">
        <p>
          By creating an account or otherwise using crwsync (the &quot;Service&quot;), you agree to these Terms of
          Service. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. What crwsync Is">
        <p>
          crwsync is a real-time team workspace: workspaces, Kanban boards, chat, files, and notifications. It is in
          early access, carries no uptime guarantee, and may change, be reset, or be taken offline without notice. A
          shared demo account with sample data is available; anything entered there is visible to everyone who uses it.
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

      <LegalSection heading="6. Optional AI Features">
        <p>
          Some workspaces offer optional AI features: summarising a chat room, producing a board digest, drafting
          tasks from selected messages, and generating stand-up notes. They run only when a member triggers them.
          When one runs, the selected workspace content (message text, task titles, descriptions, dates, and member
          display names) is sent to Anthropic&apos;s API for processing. Email addresses, account identifiers, and file
          contents are not sent. Task drafts are only suggestions; nothing is created until a member confirms it.
        </p>
        <p>
          AI output may be inaccurate or incomplete. Check it before you rely on it or act on it. You are responsible
          for what you do with it.
        </p>
      </LegalSection>

      <LegalSection heading="7. Early-Access Waitlist">
        <p>
          If you join the waitlist we collect your email address, your team size, and, if you choose to give it, what
          you would use crwsync for. We use this only to contact you about early access. To have your entry removed,
          write to{" "}
          <a href={`mailto:${contactEmail}`} className="text-accent underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="8. Data Export &amp; Deletion">
        <p>
          You can download a copy of your account and activity data, or permanently close your account, at any time
          from <span className="text-foreground font-medium">Account Settings → Privacy</span> in the dashboard. See
          our <a href="/legal/privacy" className="text-accent underline underline-offset-2">Privacy Policy</a> for
          details on what closing an account does to shared content.
        </p>
      </LegalSection>

      <LegalSection heading="9. Termination">
        <p>
          You may stop using the Service and close your account at any time. We may suspend or remove accounts that
          violate these Terms or that abuse the Service&apos;s infrastructure.
        </p>
      </LegalSection>

      <LegalSection heading="10. Disclaimer &amp; Limitation of Liability">
        <p>
          The Service is provided &quot;as is,&quot; without warranties of any kind, while in early access. To
          the fullest extent permitted by law, the author is not liable for any damages arising from use of the
          Service, including loss of data.
        </p>
      </LegalSection>

      <LegalSection heading="11. Source &amp; License">
        <p>
          crwsync&apos;s source is public for reading, study, and personal or educational use under the PolyForm
          Noncommercial 1.0.0 license. Commercial use requires a separate license from the author.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after a change constitutes
          acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions about these Terms can be sent to{" "}
          <a href={`mailto:${contactEmail}`} className="text-accent underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

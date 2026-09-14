import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = {
  title: "Privacy Policy — crwsync",
  description: "How crwsync collects, uses, and lets you control your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" lastUpdated="September 14, 2026">
      <LegalSection heading="1. Information We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="text-foreground font-medium">Account information:</span> name, username, email,
            birthdate, password (stored as a bcrypt hash, never in plaintext), and optional avatar image.
          </li>
          <li>
            <span className="text-foreground font-medium">Workspace content:</span> boards, tasks, comments, chat
            messages, and files you or your teammates create.
          </li>
          <li>
            <span className="text-foreground font-medium">Session &amp; technical data:</span> short-lived
            authentication tokens (HTTP-only cookies), IP address, and user-agent string, used to keep you signed in
            and to show your own active sessions back to you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How We Use Information">
        <p>
          Information is used exclusively to operate the Service: authenticating you, syncing workspace state in
          real time to your teammates, sending transactional email you&apos;ve triggered (password resets, email
          verification, invites), and diagnosing errors. We do not sell data, run advertising, or use analytics
          trackers.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cookies &amp; Session Tokens">
        <p>
          crwsync uses HTTP-only, secure cookies to carry your signed-in session between the public site and the
          dashboard. These cookies are strictly functional — there are no third-party advertising or tracking
          cookies.
        </p>
      </LegalSection>

      <LegalSection heading="4. Third-Party Processors">
        <p>
          Two categories of third-party services process data on our behalf, scoped to what&apos;s required to run
          the Service:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="text-foreground font-medium">Sentry (error tracking):</span> receives crash reports and
            stack traces from the backend and both frontends so issues can be diagnosed, at a sampled rate.
          </li>
          <li>
            <span className="text-foreground font-medium">Operator SMTP provider:</span> delivers transactional
            email (verification, password reset, invites) that you explicitly trigger. No SMTP credentials are
            provisioned by default in this demo — email delivery only works if an operator supplies their own.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Data Retention">
        <p>
          Your data is retained as long as your account exists. Expired authentication sessions are purged on a
          schedule. Closing your account (see below) removes or anonymizes your personal information immediately.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your Rights: Export &amp; Deletion">
        <p>
          From <span className="text-foreground font-medium">Account Settings → Privacy</span> in the dashboard, you
          can:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="text-foreground font-medium">Export your data</span> — download a JSON file of your
            profile, workspace memberships, tasks, comments, and chat messages.
          </li>
          <li>
            <span className="text-foreground font-medium">Close your account</span> — your sessions are revoked
            immediately, your personal information (name, email, username, password, avatar) is scrubbed, and you
            are removed from every workspace. Workspaces where you were the only member are deleted outright. If
            you&apos;re the sole owner of a workspace with other members, you&apos;ll be asked to transfer ownership
            or delete that workspace first — this prevents your deletion from destroying boards and conversations
            your teammates still rely on. Content you authored elsewhere (comments, tasks, messages) stays attached
            to a de-identified &quot;Deleted User&quot; record rather than disappearing out from under your former
            teammates.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Children's Privacy">
        <p>
          The Service is not directed at children under 13, consistent with the minimum age enforced at sign-up.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by updating the
          &quot;Last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Questions about this Policy, or requests regarding your data, can be sent to{" "}
          <a href="mailto:support@crwsync.xyz" className="text-accent underline underline-offset-2">
            support@crwsync.xyz
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

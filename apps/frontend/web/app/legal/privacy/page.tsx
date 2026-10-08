import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { contactEmail } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/legal/privacy" },
  description: "How crwsync collects, uses, and protects your account, workspace, waitlist, and session data, and the controls you have over it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" lastUpdated="October 8, 2026">
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
          <li>
            <span className="text-foreground font-medium">Waitlist entries:</span> email address, team size, and an
            optional description of how you would use crwsync, if you join the early-access waitlist.
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
          Three categories of third-party services process data on our behalf, scoped to what&apos;s required to run
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
            provisioned by default — email delivery only works if an operator supplies their own.
          </li>
          <li>
            <span className="text-foreground font-medium">Anthropic (optional AI features):</span> see section 5.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Optional AI Features">
        <p>
          Optional AI features (chat summaries, board digests, task drafts from messages, and stand-up notes) send
          workspace content to Anthropic&apos;s API for processing. This happens only when a member triggers a
          feature, and only for the content that feature needs:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Chat features: the text and timestamps of the selected messages and the display names of their authors.</li>
          <li>Board and stand-up features: task titles, descriptions, columns, priorities, due dates, activity times, and member display names.</li>
          <li>Not sent: email addresses, passwords or tokens, account identifiers, and file contents.</li>
        </ul>
        <p>
          crwsync does not write AI output to its database; results are held briefly so they can be shown to the member
          who asked, and tasks are only created if a member confirms a draft. Anthropic processes the content under its
          own terms and{" "}
          <a href="https://www.anthropic.com/legal/privacy" className="text-accent underline underline-offset-2">
            privacy policy
          </a>
          . AI output may be inaccurate. Do not trigger these features on content you are not allowed to share with a
          processor.
        </p>
      </LegalSection>

      <LegalSection heading="6. Early-Access Waitlist">
        <p>
          If you join the waitlist we store your email address, team size, and optional use description. We use them
          only to contact you about early access and do not use tracking on the form. To have your entry deleted, write
          to{" "}
          <a href={`mailto:${contactEmail}`} className="text-accent underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="7. Data Retention">
        <p>
          Your data is retained as long as your account exists. Expired authentication sessions are purged on a
          schedule. Closing your account (see below) removes or anonymizes your personal information immediately.
        </p>
      </LegalSection>

      <LegalSection heading="8. Your Rights: Export &amp; Deletion">
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

      <LegalSection heading="9. Children's Privacy">
        <p>
          The Service is not directed at children under 13, consistent with the minimum age enforced at sign-up.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by updating the
          &quot;Last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about this Policy, or requests regarding your data, can be sent to{" "}
          <a href={`mailto:${contactEmail}`} className="text-accent underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

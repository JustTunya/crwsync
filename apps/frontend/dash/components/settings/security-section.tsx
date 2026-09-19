"use client";

import { ShieldIcon } from "@hugeicons/core-free-icons";
import { SectionHeader } from "@/components/settings/section-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SessionsList } from "@/components/settings/sessions-list";

export function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-24">
      <SectionHeader
        icon={ShieldIcon}
        title="Security & Authentication"
        description="Manage your account password, active sessions, and authorized devices."
      />

      <div className="space-y-6">
        <ChangePasswordForm />
        <SessionsList />
      </div>
    </section>
  );
}

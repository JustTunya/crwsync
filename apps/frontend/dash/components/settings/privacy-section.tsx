"use client";

import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { SectionHeader } from "@/components/settings/section-header";
import { ExportDataCard } from "@/components/settings/export-data-card";

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-24">
      <SectionHeader
        icon={LockKeyIcon}
        title="Data & Privacy"
        description="Access and export your personal data in accordance with data portability standards."
      />

      <div className="space-y-6">
        <ExportDataCard />
      </div>
    </section>
  );
}

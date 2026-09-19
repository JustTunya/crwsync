import { ProfileForm } from "@/components/settings/profile-form";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SecuritySection } from "@/components/settings/security-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { CloseAccountDangerZone } from "@/components/settings/close-account-danger-zone";

export default function SettingsPage() {
  return (
    <>
      <ProfileForm />
      <AppearanceSection />
      <NotificationsSection />
      <SecuritySection />
      <PrivacySection />
      <CloseAccountDangerZone />
    </>
  );
}

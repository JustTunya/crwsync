import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SessionsList } from "@/components/settings/sessions-list";

export default function SecuritySettingsPage() {
  return (
    <>
      <ChangePasswordForm />
      <SessionsList />
    </>
  );
}

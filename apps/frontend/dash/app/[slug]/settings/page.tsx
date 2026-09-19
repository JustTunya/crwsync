import { WorkspaceGeneralForm } from "@/components/settings/workspace-general-form";
import { WorkspaceMembersAdmin } from "@/components/settings/workspace-members-admin";
import { WorkspaceDangerZone } from "@/components/settings/workspace-danger-zone";

export default function WorkspaceSettingsPage() {
  return (
    <>
      <WorkspaceGeneralForm />
      <WorkspaceMembersAdmin />
      <WorkspaceDangerZone />
    </>
  );
}

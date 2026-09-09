import { WorkspaceSettingsShell } from "@/components/settings/workspace-settings-shell";

export default function WorkspaceSettingsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceSettingsShell>{children}</WorkspaceSettingsShell>;
}

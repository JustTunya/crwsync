import { CreateWorkspaceForm } from "@/components/create-ws-form";
import { GlassBox } from "@/components/ui/glassbox";
import { Lead } from "@/components/ui/lead";
import { Ripple } from "@/components/ui/ripple";

export default function CreateWorkspacePage() {
  return (
    <>
      <Ripple />
      <div className="flex items-center justify-center min-h-screen px-4">
        <GlassBox>
          <Lead title="Create Workspace" description="Please enter the details for your new workspace." />
          <CreateWorkspaceForm />
        </GlassBox>
      </div>
    </>
  );
}
import { CreateWorkspaceForm } from "@/components/create-ws-form";

export default function CreateWorkspacePage() {
  return (
    <div className="min-h-screen max-w-md mx-auto p-6 bg-card rounded-lg shadow">
      <h1 className="text-2xl font-semibold mb-6">Create a New Workspace</h1>
      <CreateWorkspaceForm />
    </div>
  );
}
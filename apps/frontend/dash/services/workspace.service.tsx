import { isAxiosError } from "axios";
import { CreateWorkspacePayload, InviteMemberPayload, UpdateWorkspacePayload, Workspace, WorkspaceMember, WorkspaceOperationState, WorkspacePendingInvite } from "@crwsync/types";
import { api } from "@/services/auth.service";

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceOperationState<(WorkspaceMember)[]>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch workspace members" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function createWorkspace(data: CreateWorkspacePayload): Promise<WorkspaceOperationState<Workspace>> {
  try {
    const response = await api.post("/workspaces", data);
    return { success: true, message: "Workspace created successfully", data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "Failed to create workspace" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getWorkspaces(): Promise<WorkspaceOperationState<WorkspaceMember[]>> {
  try {
    const response = await api.get("/workspaces");
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch workspaces" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getWorkspace(id: string): Promise<WorkspaceOperationState<Workspace>> {
  try {
    const response = await api.get(`/workspaces/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch workspace details" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateWorkspace(id: string, data: UpdateWorkspacePayload): Promise<WorkspaceOperationState<Workspace>> {
  try {
    const response = await api.patch(`/workspaces/${id}`, data);
    return { success: true, message: "Workspace updated successfully", data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "Failed to update workspace" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function deleteWorkspace(id: string): Promise<WorkspaceOperationState> {
  try {
    await api.delete(`/workspaces/${id}`);
    return { success: true, message: "Workspace deleted successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to delete workspace" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function getWorkspacePendingInvites(workspaceId: string): Promise<WorkspaceOperationState<WorkspacePendingInvite[]>> {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/invites`);
    return { success: true, data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to fetch pending invites" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<WorkspaceOperationState> {
  try {
    await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
    return { success: true, message: "Invitation revoked successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to revoke invitation" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function inviteMember(workspaceId: string, data: InviteMemberPayload): Promise<WorkspaceOperationState> {
  try {
    await api.post(`/workspaces/${workspaceId}/invites`, data);
    return { success: true, message: "Invitation sent successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, errors: resp?.errors || {}, message: resp?.message || "Failed to send invitation" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function acceptInvite(workspaceId: string): Promise<WorkspaceOperationState> {
  try {
    await api.post(`/workspaces/${workspaceId}/invites/accept`);
    return { success: true, message: "Invitation accepted successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to accept invitation" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function declineInvite(workspaceId: string): Promise<WorkspaceOperationState> {
  try {
    await api.post(`/workspaces/${workspaceId}/invites/decline`);
    return { success: true, message: "Invitation declined successfully" };
  } catch (error) {
    if (isAxiosError(error)) {
      const resp = error.response?.data;
      return { success: false, message: resp?.message || "Failed to decline invitation" };
    }
    return { success: false, message: "An unexpected error occurred" };
  }
}
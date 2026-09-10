export interface FileRoom {
  id: string;
  workspace_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFileUploader {
  id: string;
  firstname: string;
  lastname: string;
  avatar_key: string | null;
}

export interface WorkspaceFile {
  id: string;
  file_room_id: string;
  key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  uploader?: WorkspaceFileUploader;
}

export interface CreateFileRoomPayload {
  name: string;
  project_id?: string;
}

export interface CreateWorkspaceFilePayload {
  key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

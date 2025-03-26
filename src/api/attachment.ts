import { invoke } from "@tauri-apps/api/core";

interface UploadAttachmentPayload {
  serverId: string;
  sessionId: string;
  filePaths: string[];
}

interface UploadAttachmentResponse {
  acknowledged: boolean;
  attachments: string[];
}

export const uploadAttachment = async (payload: UploadAttachmentPayload) => {
  const response = await invoke<UploadAttachmentResponse>("upload_attachment", {
    ...payload,
  });

  if (response?.acknowledged) {
    return response.attachments;
  }
};

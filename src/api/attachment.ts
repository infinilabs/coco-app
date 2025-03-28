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

type GetAttachmentPayload = Omit<UploadAttachmentPayload, "filePaths">;

export interface AttachmentHit {
  _index: string;
  _type: string;
  _id: string;
  _score: number;
  _source: {
    id: string;
    created: string;
    updated: string;
    session: string;
    name: string;
    icon: string;
    url: string;
    size: number;
  };
}

interface GetAttachmentResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: AttachmentHit[];
  };
}

interface DeleteAttachmentPayload {
  serverId: string;
  id: string;
}

export const uploadAttachment = async (payload: UploadAttachmentPayload) => {
  const response = await invoke<UploadAttachmentResponse>("upload_attachment", {
    ...payload,
  });

  if (response?.acknowledged) {
    return response.attachments;
  }
};

export const getAttachment = (payload: GetAttachmentPayload) => {
  return invoke<GetAttachmentResponse>("get_attachment", { ...payload });
};

export const deleteAttachment = (payload: DeleteAttachmentPayload) => {
  return invoke<boolean>("delete_attachment", { ...payload });
};

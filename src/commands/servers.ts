import { invoke } from "@tauri-apps/api/core";

import {
  ServerTokenResponse,
  Server,
  Connector,
  DataSource,
  GetResponse,
  UploadAttachmentPayload,
  UploadAttachmentResponse,
  GetAttachmentPayload,
  GetAttachmentResponse,
  DeleteAttachmentPayload,
  TranscriptionPayload,
  TranscriptionResponse,
} from "@/types/commands";

export function get_server_token(id: string): Promise<ServerTokenResponse> {
  return invoke(`get_server_token`, { id });
}

export function list_coco_servers(): Promise<Server[]> {
  return invoke(`list_coco_servers`);
}

export function add_coco_server(endpoint: string): Promise<Server> {
  return invoke(`add_coco_server`, { endpoint });
}

export function enable_server(id: string): Promise<void> {
  return invoke(`enable_server`, { id });
}

export function disable_server(id: string): Promise<void> {
  return invoke(`disable_server`, { id });
}

export function remove_coco_server(id: string): Promise<void> {
  return invoke(`remove_coco_server`, { id });
}

export function logout_coco_server(id: string): Promise<void> {
  return invoke(`logout_coco_server`, { id });
}

export function refresh_coco_server_info(id: string): Promise<Server> {
  return invoke(`refresh_coco_server_info`, { id });
}

export function handle_sso_callback({
  serverId,
  requestId,
  code,
}: {
  serverId: string;
  requestId: string;
  code: string;
}): Promise<void> {
  return invoke(`handle_sso_callback`, {
    serverId,
    requestId,
    code,
  });
}

export function get_connectors_by_server(id: string): Promise<Connector[]> {
  return invoke(`get_connectors_by_server`, { id });
}

export function get_datasources_by_server(id: string): Promise<DataSource[]> {
  return invoke(`get_datasources_by_server`, { id });
}

export function connect_to_server(id: string, clientId: string): Promise<void> {
  return invoke(`connect_to_server`, { id, clientId });
}

export function disconnect(clientId: string): Promise<void> {
  return invoke(`disconnect`, { clientId });
}

export function chat_history({
  serverId,
  from = 0,
  size = 20,
  query = "",
}: {
  serverId: string;
  from?: number;
  size?: number;
  query?: string;
}): Promise<string> {
  return invoke(`chat_history`, {
    serverId,
    from,
    size,
    query,
  });
}

export function session_chat_history({
  serverId,
  sessionId,
  from = 0,
  size = 20,
}: {
  serverId: string;
  sessionId: string;
  from?: number;
  size?: number;
}): Promise<string> {
  return invoke(`session_chat_history`, {
    serverId,
    sessionId,
    from,
    size,
  });
}

export function close_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}): Promise<string> {
  return invoke(`close_session_chat`, {
    serverId,
    sessionId,
  });
}

export function open_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}): Promise<string> {
  return invoke(`open_session_chat`, {
    serverId,
    sessionId,
  });
}

export function cancel_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}): Promise<string> {
  return invoke(`cancel_session_chat`, {
    serverId,
    sessionId,
  });
}

export function new_chat({
  serverId,
  websocketId,
  message,
  queryParams,
}: {
  serverId: string;
  websocketId?: string;
  message: string;
  queryParams?: Record<string, any>;
}): Promise<GetResponse> {
  return invoke(`new_chat`, {
    serverId,
    websocketId,
    message,
    queryParams,
  });
}

export function send_message({
  serverId,
  websocketId,
  sessionId,
  message,
  queryParams,
}: {
  serverId: string;
  websocketId?: string;
  sessionId: string;
  message: string;
  queryParams?: Record<string, any>;
}): Promise<string> {
  return invoke(`send_message`, {
    serverId,
    websocketId,
    sessionId,
    message,
    queryParams,
  });
}

export const delete_session_chat = (serverId: string, sessionId: string) => {
  return invoke<boolean>(`delete_session_chat`, { serverId, sessionId });
};

export const update_session_chat = (payload: {
  serverId: string;
  sessionId: string;
  title?: string;
  context?: {
    attachments?: string[];
  };
}): Promise<boolean> => {
  return invoke<boolean>("update_session_chat", payload);
};

export const upload_attachment = async (payload: UploadAttachmentPayload) => {
  const response = await invoke<UploadAttachmentResponse>("upload_attachment", {
    ...payload,
  });

  if (response?.acknowledged) {
    return response.attachments;
  }
};

export const get_attachment = (payload: GetAttachmentPayload) => {
  return invoke<GetAttachmentResponse>("get_attachment", { ...payload });
};

export const delete_attachment = (payload: DeleteAttachmentPayload) => {
  return invoke<boolean>("delete_attachment", { ...payload });
};

export const transcription = (payload: TranscriptionPayload) => {
  return invoke<TranscriptionResponse>("transcription", { ...payload });
};

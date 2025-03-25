import { invoke } from '@tauri-apps/api/core';

import { ServerTokenResponse, Server, Connector, DataSource, GetResponse } from "@/types/commands"

export function get_server_token(id: string) {
  return function (): Promise<ServerTokenResponse> {
    return invoke(`get_server_token`, { id });
  };
}

export function list_coco_servers() {
  return function (): Promise<Server[]> {
    return invoke(`list_coco_servers`);
  };
}

export function add_coco_server(endpoint: string) {
  return function (): Promise<Server> {
    return invoke(`add_coco_server`, { endpoint });
  };
}

export function enable_server(id: string) {
  return function (): Promise<void> {
    return invoke(`enable_server`, { id });
  };
}

export function disable_server(id: string) {
  return function (): Promise<void> {
    return invoke(`disable_server`, { id });
  };
}

export function remove_coco_server(id: string) {
  return function (): Promise<void> {
    return invoke(`remove_coco_server`, { id });
  };
}

export function logout_coco_server(id: string) {
  return function (): Promise<void> {
    return invoke(`logout_coco_server`, { id });
  };
}

export function refresh_coco_server_info(id: string) {
  return function (): Promise<Server> {
    return invoke(`refresh_coco_server_info`, { id });
  };
}

export function handle_sso_callback({
  serverId,
  requestId,
  code,
}: {
  serverId: string;
  requestId: string;
  code: string;
}) {
  return function (): Promise<void> {
    return invoke(`handle_sso_callback`, {
      serverId,
      requestId,
      code,
    });
  };
}

export function get_connectors_by_server(id: string) {
  return function (): Promise<Connector[]> {
    return invoke(`get_connectors_by_server`, { id });
  };
}

export function get_datasources_by_server(id: string) {
  return function (): Promise<DataSource[]> {
    return invoke(`get_datasources_by_server`, { id });
  };
}

export function connect_to_server(id: string) {
  return function (): Promise<void> {
    return invoke(`connect_to_server`, { id });
  };
}

export function chat_history({
  serverId,
  from = 0,
  size = 20,
}: {
  serverId: string;
  from?: number;
  size?: number;
}) {
  return function (): Promise<string> {
    return invoke(`chat_history`, {
      serverId,
      from,
      size,
    });
  };
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
}) {
  return function (): Promise<string> {
    return invoke(`session_chat_history`, {
      serverId,
      sessionId,
      from,
      size,
    });
  };
}

export function close_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}) {
  return function (): Promise<string> {
    return invoke(`close_session_chat`, {
      serverId,
      sessionId,
    });
  };
}

export function open_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}) {
  return function (): Promise<string> {
    return invoke(`open_session_chat`, {
      serverId,
      sessionId,
    });
  };
}

export function cancel_session_chat({
  serverId,
  sessionId,
}: {
  serverId: string;
  sessionId: string;
}) {
  return function (): Promise<string> {
    return invoke(`cancel_session_chat`, {
      serverId,
      sessionId,
    });
  };
}

export function new_chat({
  serverId,
  message,
  queryParams,
}: {
  serverId: string;
  message: string;
  queryParams?: Record<string, any>;
}) {
  return function (): Promise<GetResponse> {
    return invoke(`new_chat`, {
      serverId,
      message,
      queryParams,
    });
  };
}

export function send_message({
  serverId,
  sessionId,
  message,
  queryParams,
}: {
  serverId: string;
  sessionId: string;
  message: string;
  queryParams?: Record<string, any>;
}) {
  return function (): Promise<string> {
    return invoke(`send_message`, {
      serverId,
      sessionId,
      message,
      queryParams,
    });
  };
}
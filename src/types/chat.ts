export interface Message {
  _id: string;
  _source: ISource;
  [key: string]: any;
}

export interface ISource {
  id?: string;
  created?: string;
  updated?: string;
  status?: string;
  session_id?: string;
  type?: string;
  message?: any;
  title?: string;
  question?: string;
  details?: any[] | null;
  assistant_id?: string;
  assistant_item?: any;
  [key: string]: any;
}
export interface Chat {
  _id?: string;
  _index?: string;
  _type?: string;
  _source?: ISource;
  _score?: number;
  found?: boolean;
  title?: string;
  messages?: any[];
  payload?: string;
  [key: string]: any;
}

export interface IChunkData {
  session_id: string;
  message_id: string;
  message_type: string;
  reply_to_message: string;
  chunk_sequence: number;
  chunk_type: string;
  message_chunk: string;
  [key: string]: any;
}

export interface StartPage {
  enabled?: boolean;
  logo?: {
    light?: string;
    dark?: string;
  };
  introduction?: string;
  display_assistants?: string[];
}

export interface Assistant {
  id: string;
  name: string;
  querySource?: {
    id: string;
  };
  _source?: {
    chat_settings?: {
      placeholder?: string;
    };
    datasource?: {
      enabled?: boolean;
      visible?: boolean;
      ids?: string[];
    };
    mcp_servers?: {
      enabled?: boolean;
      visible?: boolean;
      ids?: string[];
    };
  };
}
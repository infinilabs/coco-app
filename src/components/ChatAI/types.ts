export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ISource {
  id: string;
  created: string;
  updated: string;
  status: string;
  session_id?: string;
}
export interface Chat {
  _index: string;
  _type: string;
  _id: string;
  _source: ISource;
  _score?: number;
  title?: string;
  messages?: any[];
  createdAt?: Date;
  [key: string]: any;
}

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
}
export interface Chat {
  _id: string;
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

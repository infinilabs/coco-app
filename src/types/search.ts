export interface QueryHits {
  source?: QuerySource;
  score?: number;
  document: SearchDocument;
}

export interface QuerySource {
  type: string; // coco-server/local/ etc.
  id: string;   // coco server's id
  name: string; // coco server's name, local computer name, etc.
}

export interface SearchDocument {
  id: string;
  created?: string;
  updated?: string;
  source?: DataSourceReference;
  type?: string;
  category?: string;
  subcategory?: string;
  categories?: string[];
  rich_categories?: RichLabel[];
  title?: string;
  summary?: string;
  lang?: string;
  content?: string;
  icon?: string;
  thumbnail?: string;
  cover?: string;
  tags?: string[];
  url?: string;
  size?: number;
  metadata?: Record<string, any>;
  payload?: Record<string, any>;
  owner?: UserInfo;
  last_updated_by?: EditorInfo;
  querySource?: QuerySource;
  index?: number; // Index in the current search result
  globalIndex?: number;
}

export interface RichLabel {
  label?: string;
  key?: string;
  icon?: string;
}

export interface DataSourceReference {
  type?: string;
  name?: string;
  id?: string;
  icon?: string;
}

export interface UserInfo {
  avatar?: string;
  username?: string;
  userid?: string;
}

export interface EditorInfo {
  user: UserInfo;
  timestamp?: string;
}

export interface FailedRequest {
  source: QuerySource;
  status: number;
  error?: string;
  reason?: string;
}

export interface MultiSourceQueryResponse {
  failed: FailedRequest[];
  hits: QueryHits[];
  total_hits: number;
}
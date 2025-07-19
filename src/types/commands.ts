export interface ServerTokenResponse {
  access_token?: string;
}

interface Provider {
  name: string;
  icon: string;
  website: string;
  eula: string;
  privacy_policy: string;
  banner: string;
  description: string;
}

interface Version {
  number: string;
}

interface Sso {
  url: string;
}

interface AuthProvider {
  sso: Sso;
}

interface MinimalClientVersion {
  number: string;
}

type Status = "green" | "yellow" | "red";

interface Health {
  services?: Record<string, Status>;
  status: Status;
}

interface Preferences {
  theme: string;
  language: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  preferences: Preferences;
}

export interface Server {
  id: string;
  builtin: boolean;
  name: string;
  endpoint: string;
  provider: Provider;
  version: Version;
  minimal_client_version?: MinimalClientVersion;
  updated: string;
  enabled: boolean;
  public: boolean;
  available: boolean;
  health?: Health;
  profile?: UserProfile;
  auth_provider: AuthProvider;
  priority: number;
}

interface ConnectorAssets {
  icons?: Record<string, string>;
}

export interface Connector {
  id: string;
  created?: string;
  updated?: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  url?: string;
  assets?: ConnectorAssets;
}

interface ConnectorConfig {
  id?: string;
  config?: Record<string, unknown>;
}

export interface DataSource {
  id: string;
  icon?: string;
  created?: string;
  updated?: string;
  type?: string;
  name?: string;
  connector?: ConnectorConfig;
  connector_info?: Connector;
}

interface Source {
  id: string;
  created: string;
  updated: string;
  status: string;
}

export interface GetResponse {
  _id: string;
  _source: Source;
  result: string;
  payload?: Record<string, unknown>;
}

export interface UploadAttachmentPayload {
  serverId: string;
  sessionId: string;
  filePaths: string[];
}

export interface UploadAttachmentResponse {
  acknowledged: boolean;
  attachments: string[];
}

export interface GetAttachmentByIdsPayload {
  serverId: string;
  attachments: string[];
}

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

export interface GetAttachmentResponse {
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

export interface DeleteAttachmentPayload {
  serverId: string;
  id: string;
}

export interface TranscriptionPayload {
  serverId: string;
  audioType: string;
  audioContent: string;
}

export interface TranscriptionResponse {
  text: string;
}

export interface MultiSourceQueryResponse {
  failed: FailedRequest[];
  hits: QueryHits[];
  total_hits: number;
}

export interface FailedRequest {
  source: QuerySource;
  status: number;
  error?: string;
  reason?: string | null;
}

export interface QuerySource {
  type: string;
  name: string;
  id: string;
}

export interface QueryHits {
  source?: QuerySource;
  score: number;
  document: any;
}

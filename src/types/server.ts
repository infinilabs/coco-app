interface Provider {
  name: string;
  icon?: string;
  banner?: string;
  description?: string;
  eula?: string;
  privacy_policy?: string;
  website?: string;
  auth_provider?: {
    sso: {
      url: string;
    };
  };
}

interface Version {
  number: string;
}

interface MinimalClientVersion {
  number: string;
}

export type Status = 'green' | 'yellow' | 'red';

interface Health {
  services?: Record<string, Status>;
  status: Status;
}

interface Preferences {
  theme?: string;
  language?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences?: Preferences;
}

export interface Server {
  id: string;
  builtin: boolean;
  name: string;
  endpoint: string;
  provider: Provider;
  version: Version;
  minimal_client_version?: MinimalClientVersion;
  updated?: string;
  enabled: boolean;
  public: boolean;
  available: boolean;
  health?: Health;
  profile?: UserProfile | null;
  auth_provider: {
    sso: {
      url: string;
    };
  };
  priority: number;
  stats?: Record<string, any>;
}
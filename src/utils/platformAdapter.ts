// manual modification
// import { createWebAdapter } from './webAdapter';
import { createTauriAdapter } from './tauriAdapter';

import {
  TauriPlatformAdapter, 
  // WebPlatformAdapter
} from '@/types/platform';

let platformAdapter: TauriPlatformAdapter = createTauriAdapter();
// let platformAdapter: WebPlatformAdapter = createWebAdapter();

export default platformAdapter;
// manual modification
// import { createWebAdapter } from './webAdapter';
import { createTauriAdapter } from "./tauriAdapter";

let platformAdapter = createTauriAdapter();
// let platformAdapter: WebPlatformAdapter = createWebAdapter();

export default platformAdapter;

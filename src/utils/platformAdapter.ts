// manual modification
import { createTauriAdapter } from "./tauriAdapter";
import { createWebAdapter } from './webAdapter';

//let platformAdapter = createTauriAdapter();
let platformAdapter = createWebAdapter();

export default platformAdapter;

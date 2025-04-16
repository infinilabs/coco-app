// manual modification
//import { createWebAdapter } from './webAdapter';
import { createTauriAdapter } from "./tauriAdapter";

let platformAdapter = createTauriAdapter();
//let platformAdapter = createWebAdapter();

export default platformAdapter;

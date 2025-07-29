import createBLog, { IConfig } from './console-custom';

// default config
const defaultConfig: IConfig = {
  logType: 'custom',
  usernameColor: '#41b883',
  logNameColor: '#35495e'
};

// create a flexible logger function
const createLogFunction = (defaultLogConfig: Partial<IConfig> = {}) => {
  return (config: Partial<IConfig> = {}) => {
    const finalConfig = {
      ...defaultConfig,
      ...defaultLogConfig,
      ...config
    };
    return createBLog(finalConfig).log;
  };
};

// export convenient methods
export const bLog = createBLog(defaultConfig).log;
export const createLogger = createBLog;

// create a flexible logger function
export const infoLog = createLogFunction({
  logName: 'Info',
  logNameColor: '#28a745'
});

// register global logger
if (typeof window !== 'undefined') {
  (window as any).bLog = bLog;
  (window as any).infoLog = infoLog;
  (window as any).createLogger = createLogger;
}
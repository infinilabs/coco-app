export interface IConfig {
  logType?: string;
  username?: string;
  logName?: string;
  usernameColor?: string;
  logNameColor?: string;
  padding?: number;
  borderRadius?: number;
  fontColor?: string;
  usernameStyle?: string;
  logNameStyle?: string;
}

const GourdBabyColorMap = new Map([
  ["1", "#FF0000"],
  ["2", "#FFA500"],
  ["3", "#FFFF00"],
  ["4", "#008000"],
  ["5", "#00FFFF"],
  ["6", "#0000FF"],
  ["7", "#800080"],
]);

const createBLog = (config: IConfig) => {
  const logType = config.logType || "default";
  const username = config.username || "";
  const logName = config.logName || "";
  const usernameColor = config.usernameColor || "#41b883";
  const logNameColor = config.logNameColor || "#35495e";
  const padding = config.padding || 6;
  const borderRadius = config.borderRadius || 6;
  const fontColor = config.fontColor || "#FFFFFF";
  const usernameStyle = config.usernameStyle || "";
  const logNameStyle = config.logNameStyle || "";

  const logTemplate = (username = "myLog", logName = "") =>
    `${username ? "%c" + username : ""} ${logName ? "%c" + logName : ""} `;

  const customLog = (...data: any[]) => {
    console.log(
      logTemplate(username, logName),
      usernameStyle
        ? usernameStyle
        : `background: ${usernameColor}; padding: 6px; border-radius: 6px 0 0 6px;  color: #fff`,
      logNameStyle
        ? logNameStyle
        : `background: ${logNameColor}; padding: 6px; border-radius: 0 6px 6px 0;  color: #fff`,
      ...data
    );
  };

  const defaultLog = (...data: any[]) => {
    const len = data.length;
    if (len > 1) {
      data.map((item, index) => {
        let firstStyle = `
          background: ${GourdBabyColorMap.get((index % 7) + 1 + "")}; 
          padding: ${padding}px; 
          border-radius: 0 0;  
          color: ${fontColor}
        `;
        let secondStyle = `
          background: ${logNameColor}; 
          padding: ${padding}px; 
          border-radius: 0 0;  
          color: ${fontColor}
        `;
        if (index === 0) {
          firstStyle = `
            background: ${GourdBabyColorMap.get((index % 7) + 1 + "")}; 
            padding: ${padding}px; 
            margin-top: ${padding * 2}px;
            border-radius: ${borderRadius}px 0 0 0; 
            color: ${fontColor}
          `;
          secondStyle = `
            background: ${logNameColor}; 
            padding: ${padding}px; 
            margin-top: ${padding * 2}px;
            border-radius: 0 ${borderRadius}px 0 0;  
            color: ${fontColor}
          `;
        } else if (index === len - 1) {
          firstStyle = `
            background: ${GourdBabyColorMap.get((index % 7) + 1 + "")}; 
            padding: ${padding}px; 
            margin-bottom: ${padding * 2}px;
            border-radius: 0 0 0 ${borderRadius}px;
            color: ${fontColor}
          `;
          secondStyle = `
            background: ${logNameColor}; 
            padding: ${padding}px; 
            margin-bottom: ${padding * 2}px;
            border-radius: 0 0 ${borderRadius}px 0;  
            color: ${fontColor}
          `;
        }
        console.log(
          logTemplate(username, `data${index + 1}`),
          firstStyle,
          secondStyle,
          item
        );
      });
    } else {
      const firstStyle = `
        background: ${usernameColor}; 
        padding: ${padding}px; 
        border-radius: ${borderRadius}px 0 0 ${borderRadius}px;  
        color: ${fontColor}
      `;

      const secondStyle = `
        background: ${logNameColor}; 
        padding: ${padding}px; 
        border-radius: 0 ${borderRadius}px ${borderRadius}px 0;  
        color: ${fontColor}
      `;

      console.log(
        logTemplate(username, logName),
        firstStyle,
        secondStyle,
        ...data
      );
    }
  };

  const log = (...data: any[]) => {
    switch (logType) {
      case "custom":
        customLog(...data);
        break;
      default:
        defaultLog(...data);
    }
  };

  return {
    log,
  };
};

export default createBLog;

import { useEffect, useState } from "react";

const useScript = (src: string, onError?: () => void) => {
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return; // Prevent duplicate script loading
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onerror = () => {
      console.error(`Failed to load script: ${src}`);
      if (onError) onError();
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [src, onError]);
};

export default useScript;

export const useIconfontScript = () => {
  const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");

  const [_useLocalFallback, setUseLocalFallback] = useState(false);

  let baseURL = appStore.state?.endpoint_http;
  if (!baseURL || baseURL === "undefined") {
    baseURL = "";
  }

  useScript("/assets/fonts/icons/iconfont.js");

  useScript(`${baseURL}/assets/fonts/icons/iconfont.js`, () => {
    console.log(
      "Remote iconfont loading failed, falling back to local resource"
    );
    setUseLocalFallback(true);
  });

  useScript("/assets/fonts/icons/extension.js");
};

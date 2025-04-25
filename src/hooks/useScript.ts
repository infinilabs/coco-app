import { useEffect } from 'react';

const useScript = (src: string) => {
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return; // Prevent duplicate script loading
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [src]);
};

export default useScript;


export const useIconfontScript = () => {
  const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");

  let baseURL = appStore.state?.endpoint_http
  if (!baseURL || baseURL === "undefined") {
    baseURL = "";
  }

  useScript(baseURL + '/assets/fonts/icons/iconfont.js');
};

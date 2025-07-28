import { useEffect } from "react";

const useScript = (src: string, onError?: () => void) => {
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onerror = () => {
      console.error(`Failed to load script: ${src}`);

      onError?.();
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [src, onError]);
};

export default useScript;

export const useIconfontScript = () => {
  // Coco Server Icons
  useScript("https://at.alicdn.com/t/c/font_4878526_cykw3et0ezd.js");
  // Coco App Icons
  useScript("https://at.alicdn.com/t/c/font_4934333_zclkkzo4fgo.js");
};

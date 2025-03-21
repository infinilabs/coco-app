import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import SearchChat from "./SearchChat";
import {useAppStore} from "@/stores/appStore";
import { Get } from "@/api/axiosRequest";

import "@/i18n";
// 不再全局导入样式，而是在Shadow DOM中应用
// import "@/main.css";

interface WebAppProps {
  token?: string;
  serverUrl?: string;
  width?: number;
  height?: number;
  hasModules?: string[]; 
  hideCoco?: () => void;
  theme?: "auto" | "light" | "dark";
  searchPlaceholder?: string;
  chatPlaceholder?: string;
}

function WebApp({
  width = 680,
  height = 590,
  token = "cva1j5ehpcenic3ir7k0h8fb8qtv35iwtywze248oscrej8yoivhb5b1hyovp24xejjk27jy9ddt69ewfi3n",   // https://coco.infini.cloud
  // token = "cv97ieo2sdbbru4vtha094eyxuzxdj6pvp9fbdzxb66dff0djy4rsjyju6yymypxe42lg2h7jl6ohdksecth",  // http://localhost:9000
  // token = "cv5djeb9om602jdvtnmg6kc1muyn2vcadr6te48j9t9pvt59ewrnwj7fwvxrw3va84j2a0lb5y8194fbr3jd",  // http://43.153.113.88:9000
  serverUrl = "https://coco.infini.cloud",
  hideCoco = () => {},
  hasModules = ['search', 'chat'],
  theme,
  searchPlaceholder = "",
  chatPlaceholder = "",
}: WebAppProps) {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsTauri(false);
    setEndpoint(serverUrl);
    localStorage.setItem("token", token);

    // 创建Shadow DOM
    if (containerRef.current && !shadowRootRef.current) {
      shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
      
      // 创建样式元素并添加到Shadow DOM
      const styleElement = document.createElement('style');
      
      // 使用fetch直接获取CSS内容
      fetch(new URL('@/main.css', import.meta.url).toString())
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load CSS: ${response.statusText}`);
          }
          return response.text();
        })
        .then(css => {
          styleElement.textContent = css;
        })
        .catch(err => {
          console.error('Failed to load CSS:', err);
          
          // 备选方案：直接嵌入Tailwind基础样式
          const cssText = `
            /* 基础样式 */
            @tailwind base;
            @tailwind components;
            @tailwind utilities;
            
            /* 可以在这里添加其他必要的样式 */
          `;
          styleElement.textContent = cssText;
        });
      
      shadowRootRef.current.appendChild(styleElement);
      
      // 创建内容容器
      const contentContainer = document.createElement('div');
      contentContainer.id = 'shadow-content';
      contentContainer.style.width = `${width}px`;
      contentContainer.style.height = `${height}px`;
      shadowRootRef.current.appendChild(contentContainer);
    }
  }, []);

  const query_coco_fusion = useCallback(
    async (url: string) => {
      try {
        const [error, response]: any = await Get(url);

        if (error) {
          console.error('_search', error);
          return { hits: [], total: 0 };
        }
    
        console.log("_suggest", url, response);
        const hits = response?.hits?.hits?.map((hit: any) => ({
          document: {
            ...hit._source,
          },
          score: hit._score || 0,
          source: hit._source.source || null
        })) || [];
        const total = response?.total || 0;
    
        console.log("_suggest2", url, total, hits);
    
        return {
          hits: hits,
          total_hits: total
        };
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

  const querySearch = useCallback(async (input: string) => {
    console.log(input);
    return await query_coco_fusion(`/query/_search?query=${input}`)
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      console.log(from, size, queryStrings);
      try {
        let url = `/query/_search?query=${queryStrings.query}&datasource=${queryStrings.datasource}&from=${from}&size=${size}`;
        if (queryStrings?.rich_categories) {
          url = `/query/_search?query=${queryStrings.query}&rich_category=${queryStrings.rich_category}&from=${from}&size=${size}`;
        }
        return await query_coco_fusion(url)
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

  // 使用createPortal将内容渲染到Shadow DOM中
  if (!shadowRootRef.current) {
    return <div ref={containerRef} id="searchChat-container" style={{ width: `${width}px`, height: `${height}px` }}></div>;
  }

  // 找到Shadow DOM中的内容容器
  const shadowContent = shadowRootRef.current.getElementById('shadow-content');
  
  if (!shadowContent) {
    return null;
  }

  return createPortal(
    <SearchChat
      isTauri={false}
      hideCoco={hideCoco}
      hasModules={hasModules}
      theme={theme}
      searchPlaceholder={searchPlaceholder}
      chatPlaceholder={chatPlaceholder}
      querySearch={querySearch}
      queryDocuments={queryDocuments}
    />,
    shadowContent
  );
}

export default WebApp;

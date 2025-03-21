import { useState, useRef, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  checkScreenRecordingPermission,
  requestScreenRecordingPermission,
} from "tauri-plugin-macos-permissions-api";
import {
  getScreenshotableMonitors,
  getScreenshotableWindows,
  getMonitorScreenshot,
  getWindowScreenshot,
} from "tauri-plugin-screenshots-api";
import { open } from "@tauri-apps/plugin-dialog";
import { metadata, icon } from "tauri-plugin-fs-pro-api";

import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { Sidebar } from "@/components/Assistant/Sidebar";
import type { Chat } from "@/components/Assistant/types";
import { useConnectStore } from "@/stores/connectStore";
import InputBox from "@/components/Search/InputBox";
import { DataSource } from "@/components/Assistant/types";

interface ChatProps {}

export default function Chat({}: ChatProps) {
  const currentService = useConnectStore((state) => state.currentService);

  const chatAIRef = useRef<ChatAIRef>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isTyping = false;

  const [input, setInput] = useState("");

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);

  const isChatPage = true

  useEffect(() => {
    getChatHistory();
  }, []);

  const getChatHistory = async () => {
    try {
      let response: any = await invoke("chat_history", {
        serverId: currentService?.id,
        from: 0,
        size: 20,
      });
      response = JSON.parse(response || "");
      console.log("_history", response);
      const hits = response?.hits?.hits || [];
      setChats(hits);
      if (hits[0]) {
        onSelectChat(hits[0]);
      } else {
        chatAIRef.current?.init("");
      }
    } catch (error) {
      console.error("chat_history:", error);
    }
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat._id !== chatId));
    if (activeChat?._id === chatId) {
      const remainingChats = chats.filter((chat) => chat._id !== chatId);
      if (remainingChats.length > 0) {
        setActiveChat(remainingChats[0]);
      } else {
        chatAIRef.current?.init("");
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    setInput(content);
    chatAIRef.current?.init(content);
  };

  const chatHistory = async (chat: Chat) => {
    try {
      let response: any = await invoke("session_chat_history", {
        serverId: currentService?.id,
        sessionId: chat?._id,
        from: 0,
        size: 20,
      });
      response = JSON.parse(response || "");
      console.log("id_history", response);
      const hits = response?.hits?.hits || [];
      const updatedChat: Chat = {
        ...chat,
        messages: hits,
      };
      setActiveChat(updatedChat);
    } catch (error) {
      console.error("session_chat_history:", error);
    }
  };

  const chatClose = async () => {
    if (!activeChat?._id) return;
    try {
      let response: any = await invoke("close_session_chat", {
        serverId: currentService?.id,
        sessionId: activeChat?._id,
      });
      response = JSON.parse(response || "");
      console.log("_close", response);
    } catch (error) {
      console.error("close_session_chat:", error);
    }
  };

  const onSelectChat = async (chat: any) => {
    chatClose();
    try {
      let response: any = await invoke("open_session_chat", {
        serverId: currentService?.id,
        sessionId: chat?._id,
      });
      response = JSON.parse(response || "");
      console.log("_open", response);
      chatHistory(response);
    } catch (error) {
      console.error("open_session_chat:", error);
    }
  };

  const cancelChat = async () => {
    chatAIRef.current?.cancelChat();
  };

  const clearChat = () => {
    chatClose();
    setActiveChat(undefined);
  };

  const reconnect = () => {
    chatAIRef.current?.reconnect();
  };

  const hideCoco = useCallback(() => {
    return invoke("hide_coco");
  }, []);

  const getFileUrl = useCallback((path: string) => {
    return convertFileSrc(path);
  }, []);

  const getDataSourcesByServer = useCallback(
    async (serverId: string): Promise<DataSource[]> => {
      return invoke("get_datasources_by_server", {
        id: serverId,
      });
    },
    []
  );

  const setupWindowFocusListener = useCallback(async (callback: () => void) => {
    return listen("tauri://focus", callback);
  }, []);

  const checkScreenPermission = useCallback(async () => {
    return checkScreenRecordingPermission();
  }, []);

  const requestScreenPermission = useCallback(() => {
    return requestScreenRecordingPermission();
  }, []);

  const getScreenMonitors = useCallback(async () => {
    return getScreenshotableMonitors();
  }, []);

  const getScreenWindows = useCallback(async () => {
    return getScreenshotableWindows();
  }, []);

  const captureMonitorScreenshot = useCallback(async (id: number) => {
    return getMonitorScreenshot(id);
  }, []);

  const captureWindowScreenshot = useCallback(async (id: number) => {
    return getWindowScreenshot(id);
  }, []);

  const openFileDialog = useCallback(async (options: { multiple: boolean }) => {
    return open(options);
  }, []);

  const getFileMetadata = useCallback(async (path: string) => {
    return metadata(path);
  }, []);

  const getFileIcon = useCallback(async (path: string, size: number) => {
    return icon(path, size);
  }, []);

  return (
    <div className="h-screen">
      <div className="h-[100%] flex">
        {/* Sidebar */}
        {isSidebarOpen ? (
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block bg-gray-100 dark:bg-gray-800`}
          >
            <Sidebar
              chats={chats}
              activeChat={activeChat}
              onNewChat={() => {
                chatAIRef.current?.clearChat();
              }}
              onSelectChat={onSelectChat}
              onDeleteChat={deleteChat}
              fetchChatHistory={getChatHistory}
            />
          </div>
        ) : null}

        {/* Main content */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900`}>
          {/* Chat messages */}
          <ChatAI
            ref={chatAIRef}
            key="ChatAI"
            activeChatProp={activeChat}
            isTransitioned={true}
            isSearchActive={isSearchActive}
            isDeepThinkActive={isDeepThinkActive}
            setIsSidebarOpen={setIsSidebarOpen}
            isSidebarOpen={isSidebarOpen}
            clearChatPage={clearChat}
            isChatPage={isChatPage}
            getFileUrl={getFileUrl}
            changeInput={setInput}
          />

          {/* Input area */}
          <div className={`border-t p-4 pb-0 border-gray-200 dark:border-gray-800`}>
            <InputBox
              isChatMode={true}
              inputValue={input}
              onSend={handleSendMessage}
              changeInput={setInput}
              disabled={isTyping}
              disabledChange={cancelChat}
              reconnect={reconnect}
              isSearchActive={isSearchActive}
              setIsSearchActive={() => setIsSearchActive((prev) => !prev)}
              isDeepThinkActive={isDeepThinkActive}
              setIsDeepThinkActive={() => setIsDeepThinkActive((prev) => !prev)}
              isChatPage={isChatPage}
              getDataSourcesByServer={getDataSourcesByServer}
              setupWindowFocusListener={setupWindowFocusListener}
              hideCoco={hideCoco}
              checkScreenPermission={checkScreenPermission}
              requestScreenPermission={requestScreenPermission}
              getScreenMonitors={getScreenMonitors}
              getScreenWindows={getScreenWindows}
              captureMonitorScreenshot={captureMonitorScreenshot}
              captureWindowScreenshot={captureWindowScreenshot}
              openFileDialog={openFileDialog}
              getFileMetadata={getFileMetadata}
              getFileIcon={getFileIcon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

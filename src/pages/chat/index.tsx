import { useState, useRef, useEffect, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
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
import type { Chat as typeChat } from "@/components/Assistant/types";
import { useConnectStore } from "@/stores/connectStore";
import InputBox from "@/components/Search/InputBox";
import {
  chat_history,
  session_chat_history,
  close_session_chat,
  open_session_chat,
  get_datasources_by_server,
  delete_session_chat,
  update_session_chat,
} from "@/commands";
import { DataSource } from "@/types/commands";
import HistoryList from "@/components/Common/HistoryList";
import { useSyncStore } from "@/hooks/useSyncStore";

interface ChatProps {}

export default function Chat({}: ChatProps) {
  const currentService = useConnectStore((state) => state.currentService);

  const chatAIRef = useRef<ChatAIRef>(null);

  const [chats, setChats] = useState<typeChat[]>([]);
  const [activeChat, setActiveChat] = useState<typeChat>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isTyping = false;

  const [input, setInput] = useState("");

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [keyword, setKeyword] = useState("");

  const isChatPage = true;

  useSyncStore();

  useEffect(() => {
    getChatHistory();
  }, [keyword]);

  const getChatHistory = async () => {
    try {
      let response: any = await chat_history({
        serverId: currentService?.id,
        from: 0,
        size: 20,
        query: keyword,
      });
      response = response ? JSON.parse(response) : null;
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
    handleDelete(chatId);

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

  const chatHistory = async (chat: typeChat) => {
    try {
      let response: any = await session_chat_history({
        serverId: currentService?.id,
        sessionId: chat?._id,
        from: 0,
        size: 20,
      });
      response = response ? JSON.parse(response) : null;
      console.log("id_history", response);
      const hits = response?.hits?.hits || [];
      const updatedChat: typeChat = {
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
      let response: any = await close_session_chat({
        serverId: currentService?.id,
        sessionId: activeChat?._id,
      });
      response = response ? JSON.parse(response) : null;
      console.log("_close", response);
    } catch (error) {
      console.error("close_session_chat:", error);
    }
  };

  const onSelectChat = async (chat: any) => {
    chatClose();
    try {
      let response: any = await open_session_chat({
        serverId: currentService?.id,
        sessionId: chat?._id,
      });
      response = response ? JSON.parse(response) : null;
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

  const getFileUrl = useCallback((path: string) => {
    return convertFileSrc(path);
  }, []);

  const getDataSourcesByServer = useCallback(
    async (serverId: string): Promise<DataSource[]> => {
      return get_datasources_by_server(serverId);
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
    return icon(path, { size });
  }, []);

  const handleSearch = (keyword: string) => {
    setKeyword(keyword);
  };

  const handleRename = (chatId: string, title: string) => {
    if (!currentService?.id) return;

    setChats((prev) => {
      const updatedChats = prev.map((item) => {
        if (item._id !== chatId) return item;

        return { ...item, _source: { ...item._source, title } };
      });

      const modifiedChat = updatedChats.find((item) => {
        return item._id === chatId;
      });

      if (!modifiedChat) {
        return updatedChats;
      }

      return [
        modifiedChat,
        ...updatedChats.filter((item) => item._id !== chatId),
      ];
    });

    if (activeChat?._id === chatId) {
      setActiveChat((prev) => {
        if (!prev) return prev;

        return { ...prev, _source: { ...prev._source, title } };
      });
    }

    update_session_chat({
      serverId: currentService.id,
      sessionId: chatId,
      title,
    });
  };

  const handleDelete = async (id: string) => {
    if (!currentService?.id) return;

    await delete_session_chat(currentService.id, id);
  };

  return (
    <div className="h-screen">
      <div className="h-full flex">
        {/* Sidebar */}
        {isSidebarOpen ? (
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block bg-gray-100 dark:bg-gray-800`}
          >
            <HistoryList
              list={chats}
              active={activeChat}
              onSearch={handleSearch}
              onRefresh={getChatHistory}
              onSelect={onSelectChat}
              onRename={handleRename}
              onRemove={deleteChat}
            />
          </div>
        ) : null}

        {/* Main content */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900`}>
          {/* Chat messages */}
          <div className="flex-1 overflow-auto">
            <ChatAI
              ref={chatAIRef}
              key="ChatAI"
              activeChatProp={activeChat}
              isSearchActive={isSearchActive}
              isDeepThinkActive={isDeepThinkActive}
              setIsSidebarOpen={setIsSidebarOpen}
              isSidebarOpen={isSidebarOpen}
              clearChatPage={clearChat}
              isChatPage={isChatPage}
              getFileUrl={getFileUrl}
              changeInput={setInput}
            />
          </div>

          {/* Input area */}
          <div
            className={`border-t p-4 pb-0 border-gray-200 dark:border-gray-800`}
          >
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

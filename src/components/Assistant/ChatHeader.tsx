import { MessageSquarePlus, PanelLeft, Pin, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Listbox, Popover } from "@headlessui/react";

interface Server {
  id: string;
  name: string;
  status: 'online' | 'offline';
  assistantCount: number;
}

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onOpenChatAI: () => void;
}

export function ChatHeader({ onCreateNewChat, onOpenChatAI }: ChatHeaderProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [showAI] = useState(false);
  const [servers] = useState<Server[]>([
    { id: '1', name: 'Coco Cloud', status: 'online', assistantCount: 3 },
    { id: '2', name: 'Searchkit', status: 'online', assistantCount: 3 },
    { id: '3', name: 'INFINI Labs', status: 'online', assistantCount: 2 },
    { id: '4', name: 'Test server', status: 'offline', assistantCount: 1 },
  ]);
  const [selectedServer, setSelectedServer] = useState(servers[0]);

  return (
    <header className="flex items-center justify-between py-2 px-3" data-tauri-drag-region>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenChatAI}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {showAI ? <Listbox value={selectedServer} onChange={setSelectedServer}>
          <div className="relative">
            <Listbox.Button className="relative w-48 h-8 px-3 py-1 text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <img src="/path-to-server-icon.png" className="w-4 h-4 rounded-full" />
                <span className="block truncate">{selectedServer.name}</span>
              </div>
            </Listbox.Button>
            <Listbox.Options className="absolute w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              {servers.map((server) => (
                <Listbox.Option
                  key={server.id}
                  value={server}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 px-3 ${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`
                  }
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <img src="/path-to-server-icon.png" className="w-4 h-4 rounded-full" />
                      <span>{server.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        server.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500">
                        AI Assistant: {server.assistantCount}
                      </span>
                    </div>
                  </div>
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox> : null}

        <button
          onClick={onCreateNewChat}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isPinned ? 'text-blue-500' : ''
          }`}
        >
          <Pin className="h-4 w-4" />
        </button>

        <Popover className="relative">
          <Popover.Button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreHorizontal className="h-4 w-4" />
          </Popover.Button>

          <Popover.Panel className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-2">
              <h3 className="font-medium mb-2">Servers</h3>
              <div className="space-y-2">
                {servers.map(server => (
                  <div key={server.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img src="/path-to-server-icon.png" className="w-6 h-6 rounded-full" />
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-xs text-gray-500">
                          AI Assistant: {server.assistantCount}
                        </div>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      server.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          </Popover.Panel>
        </Popover>
      </div>
    </header>
  );
}
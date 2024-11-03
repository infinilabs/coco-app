import { useState, useEffect } from "react";

interface ChatInterfaceProps {
  query: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ query }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (query) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: query,
          isUser: true,
        },
      ]);

      // 模拟 AI 响应
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: "这是一个 AI 助手的示例回复...",
            isUser: false,
          },
        ]);
        setIsTyping(false);
      }, 1000);
    }
  }, [query]);

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] p-3 rounded-lg ${
              message.isUser
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {message.content}
          </div>
        </div>
      ))}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-100 p-3 rounded-lg">正在输入...</div>
        </div>
      )}
    </div>
  );
};

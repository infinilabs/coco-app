import { useStartupStore } from "@/stores/startupStore";

export type AppState = {
  isChatMode: boolean;
  input: string;
  isTransitioned: boolean;
  isSearchActive: boolean;
  isMCPActive: boolean;
  isDeepThinkActive: boolean;
  isTyping: boolean;
  isLoading: boolean;
};

export type AppAction =
  | { type: "SET_CHAT_MODE"; payload: boolean }
  | { type: "SET_INPUT"; payload: string }
  | { type: "TOGGLE_SEARCH_ACTIVE" }
  | { type: "SET_SEARCH_ACTIVE"; payload: boolean }
  | { type: "TOGGLE_DEEP_THINK_ACTIVE" }
  | { type: "SET_DEEP_THINK_ACTIVE"; payload: boolean }
  | { type: "TOGGLE_MCP_ACTIVE" }
  | { type: "SET_MCP_ACTIVE"; payload: boolean }
  | { type: "SET_TYPING"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }

const getCachedChatMode = (): boolean => {
  const { defaultStartupWindow } = useStartupStore.getState();

  return defaultStartupWindow === "chatMode";
};

export const initialAppState: AppState = {
  isChatMode: getCachedChatMode(),
  input: "",
  isTransitioned: getCachedChatMode(),
  isSearchActive: false,
  isDeepThinkActive: false,
  isMCPActive: false,
  isTyping: false,
  isLoading: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CHAT_MODE":
      return {
        ...state,
        isChatMode: action.payload,
        isTransitioned: action.payload,
      };
    case "SET_INPUT":
      return { ...state, input: action.payload };
    case "TOGGLE_SEARCH_ACTIVE":
      return { ...state, isSearchActive: !state.isSearchActive };
    case "SET_SEARCH_ACTIVE":
      return { ...state, isSearchActive: action.payload };
    case "TOGGLE_DEEP_THINK_ACTIVE":
      return { ...state, isDeepThinkActive: !state.isDeepThinkActive };
    case "SET_DEEP_THINK_ACTIVE":
      return { ...state, isDeepThinkActive: action.payload };
    case "TOGGLE_MCP_ACTIVE":
      return { ...state, isMCPActive: !state.isMCPActive };
    case "SET_MCP_ACTIVE":
      return { ...state, isMCPActive: action.payload };
    case "SET_TYPING":
      return { ...state, isTyping: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

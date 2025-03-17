export type AppState = {
  isChatMode: boolean;
  input: string;
  isTransitioned: boolean;
  isSearchActive: boolean;
  isDeepThinkActive: boolean;
  isTyping: boolean;
  isLoading: boolean;
};

export type AppAction =
  | { type: 'SET_CHAT_MODE'; payload: boolean }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'TOGGLE_SEARCH_ACTIVE' }
  | { type: 'TOGGLE_DEEP_THINK_ACTIVE' }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

export const initialAppState: AppState = {
  isChatMode: false,
  input: "",
  isTransitioned: false,
  isSearchActive: false,
  isDeepThinkActive: false,
  isTyping: false,
  isLoading: false
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CHAT_MODE':
      return { ...state, isChatMode: action.payload, isTransitioned: action.payload };
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'TOGGLE_SEARCH_ACTIVE':
      return { ...state, isSearchActive: !state.isSearchActive };
    case 'TOGGLE_DEEP_THINK_ACTIVE':
      return { ...state, isDeepThinkActive: !state.isDeepThinkActive };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}
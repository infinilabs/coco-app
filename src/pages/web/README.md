# @infinilabs/search-chat 

## Installation

```bash
npm install @infinilabs/search-chat
# or
pnpm add @infinilabs/search-chat
# or
yarn add @infinilabs/search-chat
```

## Quick Start

```tsx
import SearchChat from '@infinilabs/search-chat';

function App() {
  return (
    <SearchChat
      serverUrl="https://your-api-url"
      width={800}
      height={600}
      hasModules={['search', 'chat']}
      defaultModule="search"
      assistantIDs={["a1", "a2"]}
      theme="auto"
      searchPlaceholder="Please enter search content"
      chatPlaceholder="Please enter chat content"
      showChatHistory={true}
      // other props...
    />
  );
}
```

## Props

| Name               | Type                           | Description                                              |
|--------------------|--------------------------------|----------------------------------------------------------|
| headers            | Record<string, unknown>        | Optional, custom request headers                         |
| serverUrl          | string                         | Optional, backend service URL                            |
| width              | number                         | Optional, component width (pixels)                       |
| height             | number                         | Optional, component height (pixels)                      |
| hasModules         | string[]                       | Optional, enabled modules, e.g. ['search', 'chat']       |
| defaultModule      | "search" \| "chat"            | Optional, default module                                 |
| assistantIDs       | string[]                       | Optional, list of available assistant IDs                |
| theme              | "auto" \| "light" \| "dark"   | Optional, theme mode                                     |
| searchPlaceholder  | string                         | Optional, search input placeholder                       |
| chatPlaceholder    | string                         | Optional, chat input placeholder                         |
| showChatHistory    | boolean                        | Optional, whether to show chat history                   |
| startPage          | StartPage                      | Optional, initial page config (see project definition)   |
| setIsPinned        | (value: boolean) => void       | Optional, callback for pinning the component             |
| onCancel           | () => void                     | Optional, cancel callback                                |
| formatUrl          | (item: any) => string          | Optional, function to format URLs                        |
| isOpen             | boolean                        | Optional, whether the component is open                  |

> For the `StartPage` type, please refer to the project definition.

## Notes
- Requires React 18 or above.
- The component is bundled as ESM format; `react` and `react-dom` must be provided by the host project.
- Supports on-demand module loading and custom themes.
- For more advanced usage, please refer to the source code or contact the developer.
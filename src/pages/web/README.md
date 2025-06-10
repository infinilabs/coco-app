# SearchChat Web Component API

A customizable search and chat interface component for web applications.

## Installation

```bash
npm install @infini/coco-app
```

## Basic Usage

```jsx
import SearchChat from '@infini/coco-app';

function App() {
  return (
    <SearchChat 
      serverUrl="https://your-server.com"
      headers={{
        "X-API-TOKEN": "your-token",
        "APP-INTEGRATION-ID": "your-app-id"
      }}
    />
  );
}
```

## Props

### `width`
- **Type**: `number`
- **Default**: `680`
- **Description**: Maximum width of the component in pixels

### `height`
- **Type**: `number`
- **Default**: `590`
- **Description**: Height of the component in pixels

### `headers`
- **Type**: `Record<string, unknown>`
- **Default**: 
```typescript
{
  "X-API-TOKEN": "default-token",
  "APP-INTEGRATION-ID": "default-id"
}
```
- **Description**: HTTP headers for API requests

### `serverUrl`
- **Type**: `string`
- **Default**: `""`
- **Description**: Base URL for the server API

### `hasModules`
- **Type**: `string[]`
- **Default**: `["search", "chat"]`
- **Description**: Available modules to show

### `defaultModule`
- **Type**: `"search" | "chat"`
- **Default**: `"search"`
- **Description**: Initial active module

### `assistantIDs`
- **Type**: `string[]`
- **Default**: `[]`
- **Description**: List of assistant IDs to use

### `theme`
- **Type**: `"auto" | "light" | "dark"`
- **Default**: `"dark"`
- **Description**: UI theme setting

### `searchPlaceholder`
- **Type**: `string`
- **Default**: `""`
- **Description**: Placeholder text for search input

### `chatPlaceholder`
- **Type**: `string`
- **Default**: `""`
- **Description**: Placeholder text for chat input

### `showChatHistory`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether to display chat history panel

### `startPage`
- **Type**: `StartPage`
- **Optional**: Yes
- **Description**: Initial page configuration

### `setIsPinned`
- **Type**: `(value: boolean) => void`
- **Optional**: Yes
- **Description**: Callback when pin status changes

### `onCancel`
- **Type**: `() => void`
- **Optional**: Yes
- **Description**: Callback when close button is clicked (mobile only)

### `isOpen`
- **Type**: `boolean`
- **Optional**: Yes
- **Description**: Control component visibility

## Events

The component emits the following events:

- `onModeChange`: Triggered when switching between search and chat modes
- `onCancel`: Triggered when the close button is clicked (mobile only)

## Mobile Support

The component is responsive and includes mobile-specific features:
- Automatic height adjustment
- Close button in top-right corner
- Touch-friendly interface

## Example

```jsx
<SearchChat
  width={800}
  height={600}
  serverUrl="https://api.example.com"
  headers={{
    "X-API-TOKEN": "your-token",
    "APP-INTEGRATION-ID": "your-app-id"
  }}
  theme="dark"
  showChatHistory={true}
  hasModules={["search", "chat"]}
  defaultModule="chat"
  setIsPinned={(isPinned) => console.log('Pinned:', isPinned)}
/>
```
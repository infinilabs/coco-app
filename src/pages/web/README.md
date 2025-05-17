# SearchChat Web Component API

## Props

### `serverUrl`
- **Type**: `string`
- **Optional**: Yes
- **Default**: `""`
- **Description**: Set the server address

### `headers`
- **Type**: `Record<string, unknown>`
- **Optional**: Yes
- **Default**: `{}`
- **Description**: Request header configuration for API calls, such as X-API-TOKEN and APP-INTEGRATION-ID

### `width`
- **Type**: `number`
- **Optional**: Yes
- **Default**: `680`
- **Description**: Width of the component container in pixels

### `height`
- **Type**: `number`
- **Optional**: Yes
- **Default**: `590`
- **Description**: Height of the component container in pixels. On mobile devices, it automatically adapts to the viewport height

### `hasModules`
- **Type**: `string[]`
- **Optional**: Yes
- **Default**: `['search', 'chat']`
- **Description**: List of enabled feature modules, currently supports 'search' and 'chat' modules

### `defaultModule`
- **Type**: `'search' | 'chat'`
- **Optional**: Yes
- **Default**: `'search'`
- **Description**: The default module to display

### `assistantIDs`
- **Type**: `string[]`
- **Optional**: Yes
- **Default**: `[]`
- **Description**: List of available assistant IDs

### `hideCoco`
- **Type**: `() => void`
- **Optional**: Yes
- **Default**: `() => {}`
- **Description**: Callback function to hide the search window

### `theme`
- **Type**: `"auto" | "light" | "dark"`
- **Optional**: Yes
- **Default**: `"dark"`
- **Description**: Theme setting, supports auto (follows system), light, and dark modes

### `searchPlaceholder`
- **Type**: `string`
- **Optional**: Yes
- **Default**: `""`
- **Description**: Placeholder text for the search input

### `chatPlaceholder`
- **Type**: `string`
- **Optional**: Yes
- **Default**: `""`
- **Description**: Placeholder text for the chat input

### `showChatHistory`
- **Type**: `boolean`
- **Optional**: Yes
- **Default**: `false`
- **Description**: Whether to display chat history

### `setIsPinned`
- **Type**: `(value: boolean) => void`
- **Optional**: Yes
- **Default**: `undefined`
- **Description**: Callback function to set window pin status

### `onCancel`
- **Type**: `() => void`
- **Optional**: Yes
- **Default**: `undefined`
- **Description**: Callback function for clicking the close button on mobile devices

## Usage Example

```tsx
import SearchChat from 'search-chat';

function App() {
  return (
    <SearchChat
      serverUrl=""
      headers={{
        "X-API-TOKEN": "your-api-token",
        "APP-INTEGRATION-ID": "your-integration-id"
      }}
      width={680}
      height={590}
      hasModules={['search', 'chat']}
      defaultModule="search"
      assistantIDs={[]}
      hideCoco={() => console.log('hide')}
      theme="dark"
      searchPlaceholder=""
      chatPlaceholder=""
      showChatHistory={false}
      setIsPinned={(isPinned) => console.log('isPinned:', isPinned)}
      onCancel={() => console.log('cancel')}
    />
  );
}
```
        
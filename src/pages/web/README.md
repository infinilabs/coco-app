# SearchChat Web Component API

## Props

### `serverUrl`
- **类型**: `string`
- **可选**: 是
- **默认值**: `""`
- **描述**: 设置服务器地址

### `headers`
- **类型**: `Record<string, unknown>`
- **可选**: 是
- **默认值**: `{}`
- **描述**: 请求头配置

### `width`
- **类型**: `number`
- **可选**: 是
- **默认值**: `680`
- **描述**: 组件容器的宽度，单位为像素

### `height`
- **类型**: `number`
- **可选**: 是
- **默认值**: `590`
- **描述**: 组件容器的高度，单位为像素

### `hasModules`
- **类型**: `string[]`
- **可选**: 是
- **默认值**: `['search', 'chat']`
- **描述**: 启用的功能模块列表，目前支持 'search' 和 'chat' 模块

### `hasFeature`
- **类型**: `string[]`
- **可选**: 是
- **默认值**: `['think', 'search', 'think_active', 'search_active']`
- **描述**: 启用的特性列表，支持 'think'、'search'、'think_active'、'search_active' 特性。其中 'think_active' 表示默认开启深度思考，'search_active' 表示默认开启搜索

### `hideCoco`
- **类型**: `() => void`
- **可选**: 是
- **默认值**: `() => {}`
- **描述**: 隐藏搜索窗口的回调函数

### `theme`
- **类型**: `"auto" | "light" | "dark"`
- **可选**: 是
- **默认值**: `"dark"`
- **描述**: 主题设置，支持自动（跟随系统）、亮色和暗色三种模式

### `searchPlaceholder`
- **类型**: `string`
- **可选**: 是
- **默认值**: `""`
- **描述**: 搜索框的占位文本

### `chatPlaceholder`
- **类型**: `string`
- **可选**: 是
- **默认值**: `""`
- **描述**: 聊天输入框的占位文本

### `showChatHistory`
- **类型**: `boolean`
- **可选**: 是
- **默认值**: `true`
- **描述**: 是否显示聊天历史记录

### `setIsPinned`
- **类型**: `(value: boolean) => void`
- **可选**: 是
- **默认值**: `undefined`
- **描述**: 设置窗口置顶状态的回调函数

## 使用示例

```tsx
import SearchChat from 'search-chat';

function App() {
  return (
    <SearchChat
      serverUrl=""
      headers={{}}
      width={680}
      height={590}
      hasModules={['search', 'chat']}
      hasFeature={['think', 'search', 'think_active', 'search_active']}
      hideCoco={() => console.log('hide')}
      theme="dark"
      searchPlaceholder=""
      chatPlaceholder=""
      showChatHistory={false}
      setIsPinned={(isPinned) => console.log('isPinned:', isPinned)}
    />
  );
}
```
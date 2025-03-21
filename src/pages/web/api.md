# SearchChat Web Component API

## Props

### `token`
- **类型**: `string`
- **可选**: 是
- **默认值**: `无`
- **描述**: 用于认证的令牌

### serverUrl
- 类型: `string`
- 默认值: `"https://coco.infini.cloud"`
- 说明: 设置服务器地址


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
- **描述**: 启用的功能模块列表，目前支持 'search' 模块

### `hideCoco`
- **类型**: `() => void`
- **可选**: 是
- **默认值**: `() => {}`
- **描述**: 隐藏搜索窗口的回调函数

### `theme`
- **类型**: `"auto" | "light" | "dark"`
- **可选**: 是
- **默认值**: `undefined`
- **描述**: 主题设置，支持自动（跟随系统）、亮色和暗色三种模式

## 使用示例

```tsx
import SearchChat from 'search-chat';

function App() {
  return (
    <SearchChat
      token="your-token"
      serverUrl=""
      width={680}
      height={590}
      hasModules={['search', 'chat']}
      hideCoco={() => console.log('hide')}
      theme="auto"
      searchPlaceholder=""
      chatPlaceholder=""
    />
  );
}
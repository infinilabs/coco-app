# @infinilabs/search-chat 组件安装与使用说明

## 安装

```bash
npm install @infinilabs/search-chat
# 或
pnpm add @infinilabs/search-chat
# 或
yarn add @infinilabs/search-chat
```

## 快速开始

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
      searchPlaceholder="请输入搜索内容"
      chatPlaceholder="请输入聊天内容"
      showChatHistory={true}
      // 其他参数...
    />
  );
}
```

## 参数说明

| 参数名             | 类型                           | 说明                                                         |
|--------------------|--------------------------------|--------------------------------------------------------------|
| headers            | Record<string, unknown>        | 可选，自定义请求头                                           |
| serverUrl          | string                         | 可选，后端服务地址                                           |
| width              | number                         | 可选，组件宽度（像素）                                       |
| height             | number                         | 可选，组件高度（像素）                                       |
| hasModules         | string[]                       | 可选，启用的模块列表，如 ['search', 'chat']                  |
| defaultModule      | "search" \| "chat"            | 可选，默认模块                                               |
| assistantIDs       | string[]                       | 可选，指定可用的助手 ID 列表                                 |
| theme              | "auto" \| "light" \| "dark"   | 可选，主题模式                                               |
| searchPlaceholder  | string                         | 可选，搜索输入框占位符                                       |
| chatPlaceholder    | string                         | 可选，聊天输入框占位符                                       |
| showChatHistory    | boolean                        | 可选，是否显示聊天历史                                       |
| startPage          | StartPage                      | 可选，初始页面配置（类型需参考实际定义）                     |
| setIsPinned        | (value: boolean) => void       | 可选，设置是否置顶的回调                                     |
| onCancel           | () => void                     | 可选，取消操作回调                                           |
| formatUrl          | (item: any) => string          | 可选，格式化 URL 的函数                                      |
| isOpen             | boolean                        | 可选，是否打开组件                                           |

> 其中 `StartPage` 类型请参考项目内定义。

## 说明
- 依赖 React 18 及以上版本。
- 组件打包为 ESM 格式，需由宿主项目提供 `react`、`react-dom`。
- 支持按需加载模块与自定义主题。
- 更多高级用法请参考源码或联系开发者。
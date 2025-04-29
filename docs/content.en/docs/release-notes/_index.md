---
weight: 80
title: "Release Notes"
---

# Release Notes

Information about release notes of Coco Server is provided here.

## Latest (In development)

### ❌ Breaking changes

### 🚀 Features

- feat: check or enter to close the list of assistants #469
- feat: add dimness settings for pinned window #470
- feat: supports Shift + Enter input box line feeds #472

### 🐛 Bug fix

### ✈️ Improvements

## 0.4.0 (2025-04-27)

### Breaking changes

### Features

- feat: history support for searching, renaming and deleting #322
- feat: linux support for application search #330
- feat: add shortcuts to most icon buttons #334
- feat: add font icon for search list #342
- feat: add a border to the main window in Windows 10 #343
- feat: mobile terminal adaptation about style #348
- feat: service list popup box supports keyboard-only operation #359
- feat: networked search data sources support search and keyboard-only operation #367
- feat: add application management to the plugin #374
- feat: add keyboard-only operation to history list #385
- feat: add error notification #386
- feat: add support for AI assistant #394
- feat: add support for calculator function #399
- feat: auto selects the first item after searching #411
- feat: web components assistant #422
- feat: right-click menu support for search #423
- feat: add chat mode launch page #424
- feat: add MCP & call LLM tools #430
- feat: ai assistant supports search and paging #431
- feat: data sources support displaying customized icons #432
- feat: add shortcut key conflict hint and reset function #442
- feat: updated to include error message #465

### Bug fix

- fix: fixed the problem of not being able to search in secondary directories #338
- fix: active shadow setting #354
- fix: chat history was not show up #377
- fix: get attachments in chat sessions
- fix: filter http query_args and convert only supported values
- fix：fixed several search & chat bugs #412
- fix: fixed carriage return problem with chinese input method #464

### Improvements

- refactor: web components #331
- refactor: refactoring login callback, receive access_token from coco-server
- chore: adjust web component styles #362
- style: modify the style #370
- style: search list details display #378
- refactor: refactoring api error handling #382
- chore: update assistant icon & think mode #397
- build: build web components and publish #404

## 0.3.0 (2025-03-31)

### Breaking changes

### Features

- feat: add web pages components #277
- feat: support for customizing some of the preset shortcuts #316
- feat: support multi websocket connections #314
- feat: add support for embeddable web widget #277

### Bug fix

### Improvements

- refactor: refactor invoke related code #309
- refactor: hide apps without icon #312

## 0.2.1 (2025-03-14)

### Features

- support for automatic in-app updates #274

### Breaking changes

### Bug fix

- Fix the issue that the fusion search include disabled servers
- Fix incorrect version type: should be string instead of u32
- Fix the chat end judgment type #280
- Fix the chat scrolling and chat rendering #282
- Fix: store data is not shared among multiple windows #298

### Improvements

- Refactor: chat components #273
- Feat: add endpoint display #282
- Chore: chat window min width & remove input bg #284
- Chore: remove selected function & add hide_coco #286
- Chore: websocket timeout increased to 2 minutes #289
- Chore: remove chat input border & clear input #295

## 0.2.0 (2025-03-07)

### Features

- Add timeout to fusion search #174
- Add api to disable or enable server #185
- Networked search supports selection of data sources #209
- Add deepthink and knowledge search options to RAG based chat
- Support i18n, add Chinese language support
- Support Windows platform
- etc.

### Breaking changes

### Bug fix

- Fix to access deeplink for linux #148
- etc.

### Improvements

- Improve app startup, init application search in background #172
- Refactoring login #173
- Init icons in background during start #176
- Refactoring health api #187
- Refactoring assistant api #195
- Refactor: remove websocket_session_id from message request #206
- Refactor: the display of search results and the logic of creating new chats #207
- Refactor: AI conversation rendering logic #216
- Refresh all server's info on purpose, get the actual health info #225
- Improve chat message display
- Improve application search, support macOS/Windows and Linux
- Display the version of the server in the settings page
- Allow to switch between different data sources in networked search
- Allow to switch servers in the settings page
- etc.

## 0.1.0 (2025-02-16)

### Features

- Fusion Search
- Chat with AI Assistant
- RAG-based AI Chat
- General Settings
- Global Shortcut
- Auto Start on Startup
- Shortcut to Features
- Application Search for macOS
- Option to Connect to Self-Hosted Coco Server

### Breaking changes

### Bug fix

### Improvements

---
weight: 80
title: "Release Notes"
---

# Release Notes

Information about release notes of Coco Server is provided here.

## Latest (In development)

### ❌ Breaking changes

### 🚀 Features

- feat: file search using spotlight #705
- feat: voice input support in both search and chat modes #732
- feat: text to speech now powered by LLM #750
- feat: file search for Windows #762

### 🐛 Bug fix

- fix(file search): apply filters before from/size parameters #741
- fix(file search): searching by name&content does not search file name #743
- fix: prevent window from hiding when moved on Windows #748
- fix: unregister ext hotkey when it gets deleted #770
- fix: indexing apps does not respect search scope config #773
- fix: restore missing category titles on subpages #772
- fix: correct incorrect assistant display when quick ai access #779
- fix: resolved minor issues with voice playback #780

### ✈️ Improvements

- refactor: prioritize stat(2) when checking if a file is dir #737
- refactor: change File Search ext type to extension #738
- refactor: create chat & send chat api #739
- chore: icon support for more file types #740
- chore: replace meval-rs with our fork to clear dep warning #745
- refactor: adjusted assistant, datasource, mcp_server interface parameters #746
- refactor: adjust extension code hierarchy #747
- chore: bump dep applications-rs #751
- chore: rename QuickLink/quick_link to Quicklink/quicklink #752
- chore: assistant params & styles #753
- chore: make optional fields optional #758
- chore: search-chat components add formatUrl & think data & icons url #765
- chore: Coco app http request headers #744
- refactor: do status code check before deserializing response #767
- style: splash adapts to the width of mobile phones #768
- chore: search-chat add language and formatUrl parameters #775

## 0.6.0 (2025-06-29)

### ❌ Breaking changes

### 🚀 Features

- feat: support `Tab` and `Enter` for delete dialog buttons #700
- feat: add check for updates #701
- feat: impl extension store #699
- feat: support back navigation via delete key #717

### 🐛 Bug fix

- fix: quick ai state synchronous #693
- fix: toggle extension should register/unregister hotkey #691
- fix: take coco server back on refresh #696
- fix: some input fields couldn’t accept spaces #709
- fix: context menu search not working #713
- fix: open extension store display #724

### ✈️ Improvements

- refactor: use author/ext_id as extension unique identifier #643
- refactor: refactoring search api #679
- chore: continue to chat page display #690
- chore: improve server list selection with enter key #692
- chore: add message for latest version check #703
- chore: log command execution results #718
- chore: adjust styles and add button reindex #719

## 0.5.0 (2025-06-13)

### ❌ Breaking changes

### 🚀 Features

- feat: check or enter to close the list of assistants #469
- feat: add dimness settings for pinned window #470
- feat: supports Shift + Enter input box line feeds #472
- feat: support for snapshot version updates #480
- feat: history list add put away button #482
- feat: the chat input box supports multi-line input #490
- feat: add `~/Applications` to the search path #493
- feat: the chat content has added a button to return to the bottom #495
- feat: the search input box supports multi-line input #501
- feat: websocket support self-signed TLS #504
- feat: add option to allow self-signed certificates #509
- feat: add AI summary component #518
- feat: dynamic log level via env var COCO_LOG #535
- feat: add quick AI access to search mode #556
- feat: rerank search results #561
- feat: ai overview support is enabled with shortcut #597
- feat: add key monitoring during reset #615
- feat: calculator extension add description #623
- feat: support right-click actions after text selection #624
- feat: add ai overview minimum number of search results configuration #625
- feat: add internationalized translations of AI-related extensions #632
- feat: context menu support for secondary pages #680

### 🐛 Bug fix

- fix: solve the problem of modifying the assistant in the chat #476
- fix: several issues around search #502
- fix: fixed the newly created session has no title when it is deleted #511
- fix: loading chat history for potential empty attachments
- fix: datasource & MCP list synchronization update #521
- fix: app icon & category icon #529
- fix: show only enabled datasource & MCP list
- fix: server image loading failure #534
- fix: panic when fetching app metadata on Windows #538
- fix: service switching error #539
- fix: switch server assistant and session unchanged #540
- fix: history list height #550
- fix: secondary page cannot be searched #551
- fix: the scroll button is not displayed by default #552
- fix: suggestion list position #553
- fix: independent chat window has no data #554
- fix: resolved navigation error on continue chat action #558
- fix: make extension search source respect parameter datasource #576
- fix: fixed issue with incorrect login status #600
- fix: new chat assistant id not found #603
- fix: resolve regex error on older macOS versions #605
- fix: fix chat log update and sorting issues #612
- fix: resolved an issue where number keys were not working on the web #616
- fix: do not panic when the datasource specified does not exist #618
- fix: fixed modifier keys not working with continue chat #619
- fix: invalid DSL error if input contains multiple lines #620
- fix: fix ai overview hidden height before message #622
- fix: tab key hides window in chat mode #641
- fix: arrow keys still navigated search when menu opened with Cmd+K #642
- fix: input lost when reopening dialog after search #644
- fix: web page unmount event #645
- fix: fix the problem of local path not opening #650
- fix: number keys not following settings #661
- fix: fix problem with up and down key indexing #676
- fix: arrow inserting escape sequences #683

### ✈️ Improvements

- chore: adjust list error message #475
- chore: refine wording on search failure
- chore：search and MCP show hidden logic #494
- chore: greetings show hidden logic #496
- refactor: fetch app list in settings in real time #498
- chore: UpdateApp component loading location #499
- chore: add clear monitoring & cache calculation to optimize performance #500
- refactor: optimizing the code #505
- refactor: optimized the modification operation of the numeric input box #508
- style: modify the style of the search input box #513
- style: chat input icons show #515
- refactor: refactoring icon component #514
- refactor: optimizing list styles in markdown content #520
- feat: add a component for text reading aloud #522
- style: history component styles #528
- style: search error styles #533
- chore: skip register server that not logged in #536
- refactor: service info related components #537
- chore: chat content can be copied #539
- refactor: refactoring search error #541
- chore: add assistant count #542
- chore: add global login judgment #544
- chore: mark server offline on user logout #546
- chore: logout update server profile #549
- chore: assistant keyboard events and mouse events #559
- chore: web component start page config #560
- chore: assistant chat placeholder & refactor input box components #566
- refactor: input box related components #568
- chore: mark unavailable server to offline on refresh info #569
- chore: only show available servers in chat #570
- refactor: search result related components #571
- chore: initialize current assistant from history #606
- chore: add onContextMenu event #629
- chore: more logs for the setup process #634
- chore: copy supports http protocol #639
- refactor: use author/ext_id as extension unique identifier #643
- chore: add special character filtering #668

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
- feat: support third party extensions #572
- feat: support ai overview #572

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

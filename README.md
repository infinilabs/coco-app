# Coco AI - Connect & Collaborate

**Tagline**: _"Coco AI - search, connect, collaborate – all in one place."_

Coco AI is a unified search platform that connects all your enterprise applications and data—Google Workspace, Dropbox, Confluent Wiki, GitHub, and more—into a single, powerful search interface. This repository contains the **COCO App**, built for both **desktop and mobile**. The app allows users to search and interact with their enterprise data across platforms.

In addition, COCO offers a **Gen-AI Chat for Teams**—imagine **ChatGPT** but tailored to your team’s unique knowledge and internal resources. COCO enhances collaboration by making information instantly accessible and providing AI-driven insights based on your enterprise's specific data.

> **Note**: Backend services, including data indexing and search functionality, are handled in a separate [repository](https://github.com/infinilabs/coco-server).

## Vision

[![Coco AI in two minutes](https://github.com/infinilabs/coco-website/blob/main/public/github-banner.gif)](http://www.youtube.com/watch?v=t-mgb5ZuDqY "Getting started with Coco AI")

At COCO AI, we aim to streamline workplace collaboration by centralizing access to enterprise data. The COCO App provides a seamless, cross-platform experience, enabling teams to easily search, connect, and collaborate within their workspace.

## Use Cases

- **Unified Search Across Platforms**: COCO integrates with all your enterprise apps, letting you search documents, conversations, and files across Google Workspace, Dropbox, GitHub, etc.
- **Cross-Platform Access**: The app is available for both desktop and mobile, so you can access your workspace from anywhere.
- **Seamless Collaboration**: COCO's search and Gen-AI chat capabilities help teams quickly find and share information, improving workplace efficiency.
- **Simplified Data Access**: By removing the friction between various tools, COCO enhances your workflow and increases productivity.

## Getting Started

### Initial Setup

**This version of pnpm requires at least Node.js v18.12**

To set up the Coco App for development:

```bash
cd coco-app
npm install -g pnpm
pnpm install
pnpm tauri dev
```

#### Desktop Development:

To start desktop development, run:

```
pnpm tauri dev

pnpm tauri build --bundles app
```

## Build in every OS

# Preposition
- Rust (https://www.rust-lang.org/learn/get-started)
- Tauri Preposition environment (https://tauri.app/start/prerequisites/)
```bash
npm install -g pnpm && pnpm install
```

- Windows
```
pnpm tauri build
# Or
pnpm tauri build --bundles nsis
# Or
pnpm tauri build --bundles msi
```

- Linux
```
pnpm tauri build
# Or
pnpm tauri build --bundles deb
# Or
pnpm tauri build --bundles rpm
# Or
pnpm tauri build --bundles appimage
```
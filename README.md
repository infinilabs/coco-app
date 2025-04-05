# Coco AI - Connect & Collaborate

**Tagline**: _"Coco AI - search, connect, collaborate – all in one place."_

Coco AI is a unified search platform that connects all your enterprise applications and data—Google Workspace, Dropbox,
Confluent Wiki, GitHub, and more—into a single, powerful search interface. This repository contains the **Coco App**,
built for both **desktop and mobile**. The app allows users to search and interact with their enterprise data across
platforms.

In addition, Coco offers a **Gen-AI Chat for Teams**—imagine **ChatGPT** but tailored to your team’s unique knowledge
and internal resources. Coco enhances collaboration by making information instantly accessible and providing AI-driven
insights based on your enterprise's specific data.

> **Note**: Backend services, including data indexing and search functionality, are handled in a
> separate [repository](https://github.com/infinilabs/coco-server).


![](./docs/static/img/coco-preview.gif)


## Vision

At Coco AI, we aim to streamline workplace collaboration by centralizing access to enterprise data. The Coco
App
provides a seamless, cross-platform experience, enabling teams to easily search, connect, and collaborate within their
workspace.

## Use Cases

- **Unified Search Across Platforms**: Coco integrates with all your enterprise apps, letting you search documents,
  conversations, and files across Google Workspace, Dropbox, GitHub, etc.
- **Cross-Platform Access**: The app is available for both desktop and mobile, so you can access your workspace from
  anywhere.
- **Seamless Collaboration**: Coco's search and Gen-AI chat capabilities help teams quickly find and share information,
  improving workplace efficiency.
- **Simplified Data Access**: By removing the friction between various tools, Coco enhances your workflow and increases
  productivity.

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

```bash
pnpm tauri dev
```

## Documentation

For full documentation on Coco AI, please visit the [Coco AI Documentation](https://docs.infinilabs.com/coco-app/main/).

## License

Coco AI is an open-source project licensed under
the [MIT License](https://github.com/infinilabs/coco-app/blob/main/LICENSE).

This means that you can freely use, modify, and
distribute the software for both personal and commercial purposes, including hosting it on your own servers.

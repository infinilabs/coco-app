# Coco AI - Connect & Collaborate

<div align="center">

**Tagline**: _"Coco AI - search, connect, collaborate – all in one place."_

Visit our website: [https://coco.rs](https://coco.rs)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-blue)](https://tauri.app/) [![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/) [![Rust](https://img.shields.io/badge/Rust-latest-orange)](https://www.rust-lang.org/) [![Node](https://img.shields.io/badge/Node-%3E%3D18.12-green)](https://nodejs.org/) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/infinilabs/coco-app/pulls) [![Version](https://img.shields.io/github/v/release/infinilabs/coco-app)](https://github.com/infinilabs/coco-app/releases) [![Build Status](https://img.shields.io/github/actions/workflow/status/infinilabs/coco-app/ci.yml)](https://github.com/infinilabs/coco-app/actions) [![Discord](https://img.shields.io/discord/1122384609359966313)](https://discord.com/invite/4tKTMkkvVX)

</div>

Coco AI is a unified search platform that connects all your enterprise applications and data—Google Workspace, Dropbox,
Confluent Wiki, GitHub, and more—into a single, powerful search interface. This repository contains the **Coco App**,
built for both **desktop and mobile**. The app allows users to search and interact with their enterprise data across
platforms.

In addition, Coco offers a **Gen-AI Chat for Teams**—imagine **ChatGPT** but tailored to your team’s unique knowledge
and internal resources. Coco enhances collaboration by making information instantly accessible and providing AI-driven
insights based on your enterprise's specific data.

> **Note**: Backend services, including data indexing and search functionality, are handled in a
separate [repository](https://github.com/infinilabs/coco-server).

![Coco AI](./docs/static/img/coco-preview.gif)

## 🚀 Vision

At Coco AI, we aim to streamline workplace collaboration by centralizing access to enterprise data. The Coco App provides a seamless, cross-platform experience, enabling teams to easily search, connect, and collaborate within their workspace.

## 💡 Use Cases

- **Unified Search Across Platforms**: Coco integrates with all your enterprise apps, letting you search documents,
  conversations, and files across Google Workspace, Dropbox, GitHub, etc.
- **Cross-Platform Access**: The app is available for both desktop and mobile, so you can access your workspace from
  anywhere.
- **Seamless Collaboration**: Coco's search and Gen-AI chat capabilities help teams quickly find and share information,
  improving workplace efficiency.
- **Simplified Data Access**: By removing the friction between various tools, Coco enhances your workflow and increases
  productivity.

## ✨ Key Features

- 🔍 **Unified Search**: One-stop enterprise search with multi-platform integration
  - Supports major collaboration platforms: Google Workspace, Dropbox, Confluence Wiki, GitHub, etc.
  - Real-time search across documents, conversations, and files
  - Smart search intent understanding with relevance ranking
  - Cross-platform data correlation and context display
- 🤖 **AI-Powered Chat**: Team-specific ChatGPT-like assistant trained on your enterprise data
- 🌐 **Cross-Platform**: Available for Windows, macOS, Linux and Web
- 🔒 **Security-First**: Support for private deployment and data sovereignty
- ⚡ **High Performance**: Built with Rust and Tauri 2.0
- 🎨 **Modern UI**: Sleek interface designed for productivity

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript
- **Desktop Framework**: Tauri 2.0
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.12
- Rust (latest stable)
- pnpm (package manager)

### Development Setup

```bash
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Production Build

```bash
pnpm tauri build
```

## 📚 Documentation

- [Coco App Documentation](https://docs.infinilabs.com/coco-app/main/)
- [Coco Server Documentation](https://docs.infinilabs.com/coco-server/main/)
- [Tauri Documentation](https://tauri.app/)

## Contributors

<a href="https://github.com/infinilabs/coco-app/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=infinilabs/coco-app" />
</a>

## 📄 License

Coco AI is an open-source project licensed under the [MIT License](LICENSE). You can freely use, modify, and
distribute the software for both personal and commercial purposes, including hosting it on your own servers.

---

<div align="center">
Built with ❤️ by <a href="https://infinilabs.com">INFINI Labs</a>
</div>

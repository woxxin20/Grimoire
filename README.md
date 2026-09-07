# GRIMOIRE // HIVE

A living digital grimoire over the existing personal knowledge engine. The React interface includes an original emerald consciousness seal, spectral Grimoire chapters, real memory and relationship views, voice commands, focus mode, and an opt-in agent council.

The visual source of truth is [the design system](design-system/grimoire-hive/MASTER.md). UI components are in `src/components/grimoire/`.

Run `npm install` and `npm run dev`, then open `http://localhost:3000`. The Express API runs on port 3001. Start voice input by clicking the core or microphone and accepting the permission seal; it never listens in the background. Browser speech support varies, and typing is always available. Use `Cmd/Ctrl + K` for commands, `Cmd/Ctrl + N` for memory capture, and Escape to interrupt.

Validation commands:

```sh
npm run typecheck
npm run build
npm test
npm run test:ui
```

Browser tests use installed Google Chrome and serve the built assets through Playwright request routing, with isolated API fixtures and no running server. Unit tests use temporary storage and disable external providers. Neither test suite writes to your real archive. Browser screenshots are saved in `artifacts/`.

The new shell connects to the existing `/api/memories`, `/api/search`, `/api/graph`, and council endpoints. Counts reflect returned records (100 memories, up to 500 graph nodes); no confidence, threat, resource, or deployment telemetry is invented. System preferences provide reduced-motion-aware animation controls and a high-contrast mode. Actual AI responses still depend on the configured engine and providers.

## Existing knowledge engine

A full-stack, production-quality Personal AI Mind and Second Brain application built for private personal use.

Unlike typical notes applications, **MIND** acts as a personal AI knowledge engine. Every piece of saved information becomes a structured memory node in a knowledge graph. Google Gemini analyzes, categorizes, summarizes, extracts entities/tags/concepts, and generates semantic vector embeddings while **100% preserving your exact original content**.

---

## 🌟 Core Architecture & Principles

1. **Exact Original Content Preservation**:
   - The original saved text (prompts, URLs, code snippets, local computer paths, JSON, notes, file references) is preserved verbatim and never overwritten or modified by AI summaries.
   - Separate **COPY ORIGINAL** (byte-for-byte exact copy) and **COPY SUMMARY** actions.

2. **Gemini API Multi-Key Failover Manager**:
   - Supports 4 API keys (`GEMINI_API_KEY_1` through `GEMINI_API_KEY_4`).
   - Automatically rotates to fallback keys upon rate limits (HTTP 429) or quota errors.
   - Logs key indices, latency, request types, and retry counts without ever leaking API key secrets.

3. **Dual Vector & Graph Storage Engine**:
   - **RuVector Service**: Integrates directly with RuVector HTTP endpoints (`RUVECTOR_URL`).
   - **Embedded SQLite Engine**: Native embedded vector cosine similarity + SQLite Graph engine fallback for seamless out-of-the-box local setup.

4. **8-Step Memory Ingestion Pipeline**:
   1. *Capture original input* (immediate save before AI processing).
   2. *Detect input type* (Text, URL, File, Image, Audio, Video, Code, JSON, Local Path).
   3. *Extract content* (Web scraping, PDF text extraction, local path metadata).
   4. *Gemini understanding* (Structured JSON extraction of Title, Category, Subcategory, Tags, Keywords, Entities, Concepts, Relationships, Importance).
   5. *Generate vector embedding* (Gemini Embedding 2 / text-embedding-004).
   6. *Vector similarity lookup*.
   7. *Gemini relationship detection* (`RELATED_TO`, `SAME_TOPIC`, `EXTENDS`, `REFERENCES`, `DEPENDS_ON`, etc.).
   8. *Graph node & edge insertion*.

5. **Hybrid Search & Mind Match Relevance Scoring**:
   - Natural language query understanding & expansion.
   - Context-aware search (retains short-lived session memory across multi-turn queries like `Gemini` → `API` → `key`).
   - Hybrid retrieval combining vector distance + SQLite FTS keyword match + graph proximity.
   - Proprietary **Mind Match Score (0–100%)** displaying human-readable match explanations.

6. **Interactive Knowledge Graph View**:
   - Canvas 2D visualization rendering Memory, Concept, Category, and Technology nodes with force-directed physics.
   - Interactive zoom, pan, node filtering, and detail inspector opening.

7. **Windows Local Computer File Path Bridge**:
   - Preserves paths like `C:\Projects\MyApp\app\src\main\java\MainActivity.kt`.
   - Triggers native Windows File Explorer (`explorer.exe /select,"C:\path\file"`) via safe backend endpoint `/api/path/open`.

---

## 🚀 Quick Setup & Installation

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
cd "c:\new mind"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your Google Gemini API key(s):
```env
GEMINI_API_KEY_1=AIzaSy...
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=

# Optional: External RuVector server URL
RUVECTOR_URL=
RUVECTOR_API_KEY=

PORT=3001
STORAGE_PATH=./data/storage
AUTH_SECRET=your_secret_passcode
```

### 3. Run Development Mode
Starts Express backend (port 3001) and Vite frontend (port 3000) concurrently:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Tests
```bash
npm test
```

---

## ⌨️ Keyboard Shortcuts & Command Palette

| Shortcut | Description |
| :--- | :--- |
| **Ctrl + K** / **Cmd + K** | Open Command Palette & Quick Search |
| **Ctrl + N** / **Cmd + N** | Open Quick Capture Modal (`+ Add Memory`) |
| **Ctrl + Enter** | Save Memory to Mind |
| **Esc** | Close Modals & Detail Inspector |

---

## 📥 Importing Legacy Memory Exports

1. Open the sidebar and click **Import JSON** (or press `Ctrl + K` → `Import Legacy JSON`).
2. Paste or upload your JSON export array containing objects with fields like `title`, `url`, `categories`, `summary`, `tags`.
3. The system automatically ingests, deduplicates, generates missing embeddings, and links nodes into the graph.

---

## 🛡️ Security & Privacy
- **Gemini API Keys**: Used exclusively in Node.js backend. Never bundled into React client JS.
- **Local Storage**: All SQLite database files and local file references stay on your local disk (`./data/storage`).
- **Privacy Lock**: Click the Shield icon in the sidebar to activate PIN passcode lock state.

---

## 🛠️ Production Build

To build frontend static assets and server TS output for production deployment:
```bash
npm run build
npm start
```
The Express server handles API requests and serves production Vite assets at `http://localhost:3001`.

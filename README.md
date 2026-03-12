# 🌊 Swimer — Full-Stack Discord Clone

A feature-rich Discord clone with **Liquid Glass UI**, **voice chat**, **real-time messaging**, **E2E encryption**, **polls**, **stickers**, and **file uploads**.

## Tech Stack
- **Backend**: Python 3.11 + FastAPI + WebSockets + WebRTC signaling
- **Frontend**: Next.js 14 + TypeScript + Zustand + Tailwind CSS

## Features
- 💬 Real-time chat (WebSocket)
- 🔒 End-to-end encryption in DMs (ECDH key exchange + AES-GCM)
- 🎙 Voice chat (WebRTC peer-to-peer, multi-user)
- 😄 Reactions (click any emoji, long-press for picker)
- ✨ Sticker packs (24 animated stickers)
- 📊 Polls with live vote updates
- 📎 File & photo uploads
- 🔁 Reply to messages
- 🟢 Online status & typing indicators
- 💜 Liquid Glass UI (backdrop-filter blur)
- 📱 Servers, channels, DMs — full Discord layout

## Project Structure
```
swimer/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── requirements.txt
│   └── uploads/          # Auto-created
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── App.tsx
    │   ├── chat/          # AuthScreen, AppShell, ChatArea, etc.
    │   ├── voice/         # VoiceBar
    │   └── modals/        # EmojiPicker, StickerPicker, PollModal, PollWidget
    ├── lib/
    │   ├── store.ts       # Zustand state
    │   ├── socket.ts      # WebSocket client
    │   ├── crypto.ts      # E2E encryption
    │   └── webrtc.ts      # Voice chat
    └── styles/
        └── globals.css    # Liquid Glass design system
```

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# → Running on http://localhost:8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# → Running on http://localhost:3000
```

### 3. Open & use
- Open `http://localhost:3000`
- Register two accounts in different browser tabs/windows
- Start chatting in real-time!

## Voice Chat
1. In the **Swimer HQ** server, click a voice channel (🔊 Voice 1)
2. Allow microphone access
3. Another user joins the same channel
4. WebRTC establishes peer-to-peer connection automatically

## E2E Encryption
- All **DMs** are end-to-end encrypted automatically
- ECDH (P-256) key exchange happens on login
- AES-GCM-256 encryption for each message
- The server **never** sees plaintext DM content
- Look for the 🔒 badge in DM conversations

## Polls
- Click 📊 in a text channel
- Create a question with up to 8 options
- All users see live vote updates

## API Docs
Visit `http://localhost:8000/docs` for interactive Swagger documentation.

## Notes
- Data is **in-memory** (resets on server restart). For production, add PostgreSQL + Redis.
- Voice chat requires both users to be on the **same network** OR a TURN server for production.
- STUN servers used: Google's public STUN (stun.l.google.com)

#!/bin/bash
# Swimer — Universal start script (works on local & Replit)
echo "🌊 Starting Swimer v3..."
cd "$(dirname "$0")"
ROOT="$(pwd)"

# Backend
cd "$ROOT/backend"
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "📦 Installing Python deps..."
  pip install -r requirements.txt --quiet
fi
echo "🚀 Backend → :8000"
python3 main.py &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Frontend
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node deps..."
  npm install --silent
fi
echo "🎨 Frontend → :3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Swimer ready!"
echo "   → http://localhost:3000"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

#!/bin/bash

# ============================================================
# GramSwasthya AI — One-Click Startup Script (Mac/Linux)
# ============================================================
# Usage: ./start.sh
# This starts both backend and frontend simultaneously.

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   GramSwasthya AI — Starting Platform${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# ── Check Python ──────────────────────────────────────────
echo -e "${BLUE}[1/6] Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found. Install from https://python.org${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
echo -e "     ✅ Python $PYTHON_VERSION found"

# ── Check Node ─────────────────────────────────────────────
echo -e "${BLUE}[2/6] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "     ✅ Node $NODE_VERSION found"

# ── Backend setup ──────────────────────────────────────────
echo -e "${BLUE}[3/6] Setting up backend...${NC}"
cd backend

# Create venv if not exists
if [ ! -d "venv" ]; then
    echo "     Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "     Installing Python packages..."
pip install -r requirements.txt -q

# Init database
echo "     Initializing database..."
python3 -c "from utils.database import init_db; init_db()" 2>/dev/null || true

echo -e "     ${GREEN}✅ Backend ready${NC}"
cd ..

# ── Frontend setup ──────────────────────────────────────────
echo -e "${BLUE}[4/6] Setting up frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "     Installing npm packages (this may take a minute)..."
    npm install -q
fi

echo -e "     ${GREEN}✅ Frontend ready${NC}"
cd ..

# ── Start servers ────────────────────────────────────────────
echo ""
echo -e "${BLUE}[5/6] Starting servers...${NC}"
echo ""

# Start backend in background
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 3

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   ✅ GramSwasthya AI is running!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "   🌐 App:      ${YELLOW}http://localhost:3000${NC}"
echo -e "   🔧 API:      ${YELLOW}http://localhost:8000${NC}"
echo -e "   📖 API Docs: ${YELLOW}http://localhost:8000/api/docs${NC}"
echo ""
echo -e "   Demo Login:"
echo -e "   👤 Admin:  admin / admin"
echo -e "   🩺 Doctor: doctor / doctor"
echo -e "   🩺 Patient: 9100000001 / patient123"
echo ""
echo -e "${BLUE}[6/6] Press Ctrl+C to stop both servers${NC}"
echo ""

# Keep script running, kill both on Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait

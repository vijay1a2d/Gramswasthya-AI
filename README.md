# 🏥 GramSwasthya AI
> AI-powered digital healthcare platform for rural and underserved communities

## 🚀 Quick Start — Run Everything

### Option A: One Command (Easiest)
```bash
cd gramswasthya
chmod +x start.sh
./start.sh
```

### Option B: Manual

#### Terminal 1 — Backend
```bash
cd gramswasthya/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 -c "from utils.database import init_db; init_db()"
uvicorn main:app --reload --port 8000
```

#### Terminal 2 — Frontend
```bash
cd gramswasthya/frontend
npm install
npm run dev
```

## 🌐 URLs
| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs |

## 🔐 Demo Login
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Doctor | doctor | doctor |
| Worker | worker | worker |

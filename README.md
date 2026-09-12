# PART — Next.js frontend + FastAPI backend

This folder contains a minimal Next.js frontend and a FastAPI backend.

- Frontend: `PART/frontend` — Next.js app (runs on port 3000)
- Backend: `PART/backend` — FastAPI app (runs on port 8000)

Environment variables:

- Frontend: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- Backend: `DATABASE_URL=./taskflow.db` and `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`

Quick start (run both):

1. Backend

```bash
cd PART/backend
python -m venv venv
# activate venv then
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

2. Frontend

```bash
cd PART/frontend
npm install
npm run dev
```

Open `http://localhost:3000` to view the frontend.

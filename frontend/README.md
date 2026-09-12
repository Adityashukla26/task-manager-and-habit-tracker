# Frontend (Next.js)

Run locally:

```bash
cd PART/frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `PART/frontend/.env.local` if your backend is not running at `http://127.0.0.1:8000`.

The page at `/` creates or signs users in, stores the returned session token, and opens onboarding or the dashboard. The dashboard persists user-owned tasks and habits through the FastAPI API.

# Backend (FastAPI)

Run locally:

```bash
cd PART/backend
python3 -m venv venv
# Windows PowerShell
.\venv\Scripts\Activate.ps1
# or Windows cmd
.\venv\Scripts\activate.bat

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Environment variables:

- `DATABASE_URL` - SQLite path or `sqlite:///...` URL. Defaults to `./taskflow.db` in this folder.
- `DATABASE_PATH` - alternate SQLite path if you prefer a path-only name.
- `CORS_ORIGINS` - comma-separated frontend origins, for example `http://localhost:3000,http://127.0.0.1:3000`.

API endpoints:

- `GET /health` - app health check
- `GET /db/health` - confirms the SQLite connection and returns row counts
- `POST /auth/signup` - creates a user and returns a bearer token
- `POST /auth/signin` - authenticates a user and returns a bearer token
- `GET /users/me` - current user profile and onboarding status
- `GET /onboarding` and `POST /onboarding` - read or upsert onboarding answers
- `GET /tasks`, `POST /tasks`, `GET /tasks/{id}`, `PUT /tasks/{id}`, `DELETE /tasks/{id}` - authenticated user tasks
- `PATCH /tasks/{id}/status` - task status transition (`todo`, `in_progress`, `blocked`, `done`)
- `GET /tasks/priority-queue` - tasks ordered by priority score and urgency
- `GET/POST /tasks/{id}/subtasks` - list or create subtasks
- `PUT/DELETE /tasks/{id}/subtasks/{subtask_id}` - update or delete a subtask
- `GET /goals`, `POST /goals`, `GET /goals/{id}`, `PUT /goals/{id}`, `DELETE /goals/{id}` - authenticated goals
- `PATCH /goals/{id}/status` - goal status transition (`active`, `completed`, `archived`)
- `GET /habits`, `POST /habits`, `PUT /habits/{id}` - authenticated habits
- `POST /habits/{id}/check-in` - save today’s habit completion state

Protected requests must send `Authorization: Bearer <token>`. SQLite tables are created automatically for users, onboarding responses, tasks, goals, subtasks, habits, and habit check-ins. Every task, goal, and habit is linked to its owning user.

Simple DB test:

```bash
curl http://127.0.0.1:8000/db/health
```

The database file is created automatically on startup if it does not already exist.

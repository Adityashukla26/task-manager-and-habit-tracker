import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

try:
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    from starlette.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE_PATH = BASE_DIR / "taskflow.db"
DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def resolve_database_path(raw_value: Optional[str]) -> Path:
    if not raw_value:
        return DEFAULT_DATABASE_PATH

    if raw_value.startswith("sqlite:///"):
        raw_value = raw_value.replace("sqlite:///", "", 1)

    database_path = Path(raw_value)
    if not database_path.is_absolute():
        database_path = BASE_DIR / database_path
    return database_path


def parse_cors_origins(raw_value: Optional[str]) -> List[str]:
    if not raw_value:
        return DEFAULT_CORS_ORIGINS

    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    return origins or DEFAULT_CORS_ORIGINS


DATABASE_PATH = resolve_database_path(os.getenv("DATABASE_URL") or os.getenv("DATABASE_PATH"))
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="TaskFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv("CORS_ORIGINS")),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str


class SigninRequest(BaseModel):
    email: str
    password: str


class TaskCreateRequest(BaseModel):
    title: str
    completed: bool = False
    description: str = ""
    priority: int = 3
    due_date: Optional[str] = None
    goal_id: Optional[int] = None
    status: str = "todo"


class TaskUpdateRequest(BaseModel):
    title: str
    completed: bool
    description: str = ""
    priority: int = 3
    due_date: Optional[str] = None
    goal_id: Optional[int] = None
    status: str = "todo"


class TaskStatusRequest(BaseModel):
    status: str


class TaskPriorityRequest(BaseModel):
    priority: int


class SubtaskCreateRequest(BaseModel):
    title: str
    completed: bool = False


class SubtaskUpdateRequest(BaseModel):
    title: str
    completed: bool = False


class OnboardingRequest(BaseModel):
    primary_goal: str
    experience_level: str
    focus_time: str
    reminder_preference: str


class HabitCreateRequest(BaseModel):
    name: str
    frequency: str = "daily"
    target: int = 1
    kind: str = "build"
    goal_id: Optional[int] = None
    unit: str = "times"


class HabitUpdateRequest(BaseModel):
    name: str
    frequency: str
    target: int
    active: bool = True
    kind: str = "build"
    goal_id: Optional[int] = None
    unit: str = "times"


class HabitCheckinRequest(BaseModel):
    completed: bool = True


class ReductionPlanRequest(BaseModel):
    baseline: float
    target: float
    strategy: str
    triggers: str = ""
    replacement: str = ""
    unit: str = "times"


class UsageLogRequest(BaseModel):
    amount: float
    logged_on: Optional[str] = None
    note: str = ""


class GoalCreateRequest(BaseModel):
    title: str
    description: str = ""
    target_date: Optional[str] = None
    status: str = "active"


class GoalUpdateRequest(BaseModel):
    title: str
    description: str = ""
    target_date: Optional[str] = None
    status: str = "active"


class GoalStatusRequest(BaseModel):
    status: str


class RecommendationActionRequest(BaseModel):
    action: str = "apply"


class WeeklyReviewRequest(BaseModel):
    week_start: str
    wins: str = ""
    blockers: str = ""
    next_focus: str = ""
    rating: int = 3


security = HTTPBearer(auto_error=False)


def get_db():
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def is_valid_email(email: str) -> bool:
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 260000
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${password_hash.hex()}"


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, hash_hex = encoded_password.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
    except ValueError:
        return False

    derived_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(derived_hash, expected_hash)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_jwt_token(user_id: int, email: str) -> str:
    """Create a JWT token for the given user."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Dependency to get the current user from JWT token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = verify_jwt_token(credentials.credentials)
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, full_name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.on_event("startup")
def on_startup():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        task_columns = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)").fetchall()}
        if "user_id" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
        if "description" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''")
        if "priority" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 3")
        if "due_date" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT")
        if "goal_id" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL")
        if "status" not in task_columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS onboarding_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                primary_goal TEXT NOT NULL,
                experience_level TEXT NOT NULL,
                focus_time TEXT NOT NULL,
                reminder_preference TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                frequency TEXT NOT NULL DEFAULT 'daily',
                target INTEGER NOT NULL DEFAULT 1,
                active INTEGER NOT NULL DEFAULT 1,
                kind TEXT NOT NULL DEFAULT 'build',
                goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
                unit TEXT NOT NULL DEFAULT 'times',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        habit_columns = {row["name"] for row in conn.execute("PRAGMA table_info(habits)").fetchall()}
        if "kind" not in habit_columns:
            conn.execute("ALTER TABLE habits ADD COLUMN kind TEXT NOT NULL DEFAULT 'build'")
        if "goal_id" not in habit_columns:
            conn.execute("ALTER TABLE habits ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL")
        if "unit" not in habit_columns:
            conn.execute("ALTER TABLE habits ADD COLUMN unit TEXT NOT NULL DEFAULT 'times'")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                target_date TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS subtasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habit_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
                completed_on TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 1,
                UNIQUE(habit_id, completed_on)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                logged_on TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 1,
                amount REAL NOT NULL DEFAULT 1,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(habit_id, logged_on)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reduction_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL UNIQUE REFERENCES habits(id) ON DELETE CASCADE,
                baseline REAL NOT NULL,
                target REAL NOT NULL,
                strategy TEXT NOT NULL,
                triggers TEXT NOT NULL DEFAULT '',
                replacement TEXT NOT NULL DEFAULT '',
                unit TEXT NOT NULL DEFAULT 'times',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reduction_usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL REFERENCES reduction_plans(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                logged_on TEXT NOT NULL,
                amount REAL NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(plan_id, logged_on)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                progress_date TEXT NOT NULL,
                completion_rate REAL NOT NULL DEFAULT 0,
                task_score REAL NOT NULL DEFAULT 0,
                habit_score REAL NOT NULL DEFAULT 0,
                reduction_percent REAL NOT NULL DEFAULT 0,
                best_performance_window TEXT NOT NULL DEFAULT '',
                postponements INTEGER NOT NULL DEFAULT 0,
                weekend_habit_misses INTEGER NOT NULL DEFAULT 0,
                total_score REAL NOT NULL DEFAULT 0,
                UNIQUE(user_id, progress_date)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS weekly_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                week_start TEXT NOT NULL,
                completion_rate REAL NOT NULL DEFAULT 0,
                average_score REAL NOT NULL DEFAULT 0,
                reduction_percent REAL NOT NULL DEFAULT 0,
                best_performance_window TEXT NOT NULL DEFAULT '',
                postponements INTEGER NOT NULL DEFAULT 0,
                weekend_habit_misses INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_id, week_start)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                week_start TEXT NOT NULL,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'unread',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                week_start TEXT NOT NULL,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                payload TEXT NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS weekly_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                week_start TEXT NOT NULL,
                wins TEXT NOT NULL DEFAULT '',
                blockers TEXT NOT NULL DEFAULT '',
                next_focus TEXT NOT NULL DEFAULT '',
                rating INTEGER NOT NULL DEFAULT 3,
                submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, week_start)
            )
            """
        )
        conn.commit()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db/health")
def db_health():
    with get_db() as conn:
        user_count = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        task_count = conn.execute("SELECT COUNT(*) AS count FROM tasks WHERE user_id IS NOT NULL").fetchone()["count"]
        habit_count = conn.execute("SELECT COUNT(*) AS count FROM habits").fetchone()["count"]

    return {
        "status": "ok",
        "database": str(DATABASE_PATH),
        "users": user_count,
        "tasks": task_count,
        "habits": habit_count,
    }


@app.post("/auth/signup")
def signup(payload: SignupRequest):
    """
    Register a new user.
    
    Returns a JWT token on success.
    """
    full_name = payload.full_name.strip()
    email = normalize_email(payload.email)
    password = payload.password

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        cursor = conn.execute(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            (full_name, email, hash_password(password)),
        )
        conn.commit()
        user_id = cursor.lastrowid

    token = create_jwt_token(user_id, email)

    return {
        "token": token,
        "user_id": user_id,
        "full_name": full_name,
        "email": email,
    }


@app.post("/auth/signin")
def signin(payload: SigninRequest):
    """
    Sign in a user with email and password.
    
    Returns a JWT token on success.
    """
    email = normalize_email(payload.email)

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, full_name, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"], user["email"])

    return {
        "token": token,
        "user_id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
    }


@app.get("/users/me")
def get_me(user=Depends(get_current_user)):
    """
    Get current user profile and onboarding information.
    """
    with get_db() as conn:
        onboarding = conn.execute(
            "SELECT primary_goal, experience_level, focus_time, reminder_preference FROM onboarding_responses WHERE user_id = ?",
            (user["id"],),
        ).fetchone()

    return {
        "user_id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "onboarding": dict(onboarding) if onboarding else None,
    }


@app.post("/onboarding")
def save_onboarding(payload: OnboardingRequest, user=Depends(get_current_user)):
    payload_data = payload.dict()
    values = tuple(value.strip() for value in payload_data.values())
    if not all(values):
        raise HTTPException(status_code=400, detail="All onboarding answers are required")

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO onboarding_responses (user_id, primary_goal, experience_level, focus_time, reminder_preference)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                primary_goal = excluded.primary_goal,
                experience_level = excluded.experience_level,
                focus_time = excluded.focus_time,
                reminder_preference = excluded.reminder_preference,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user["id"], *values),
        )
        conn.commit()

    return {"ok": True, "answers": dict(zip(payload_data.keys(), values))}


@app.get("/onboarding")
def read_onboarding(user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT primary_goal, experience_level, focus_time, reminder_preference FROM onboarding_responses WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
    return dict(row) if row else None


VALID_GOAL_STATUSES = {"active", "completed", "archived"}


def validate_goal_payload(payload):
    title = payload.title.strip()
    description = payload.description.strip()
    status = payload.status.strip().lower()

    if not title:
        raise HTTPException(status_code=400, detail="Goal title is required")
    if status not in VALID_GOAL_STATUSES:
        raise HTTPException(status_code=400, detail="Goal status must be active, completed, or archived")

    return title, description, payload.target_date, status


def goal_response(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "target_date": row["target_date"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def goal_detail_response(conn, row, user_id):
    result = goal_response(row)
    task_rows = conn.execute(
        "SELECT id, title, description, completed, priority, due_date, goal_id, status FROM tasks WHERE goal_id = ? AND user_id = ? ORDER BY id",
        (row["id"], user_id),
    ).fetchall()
    result["tasks"] = [get_task_for_user(conn, task["id"], user_id) for task in task_rows]
    habit_rows = conn.execute("SELECT * FROM habits WHERE goal_id = ? AND user_id = ? AND active = 1 ORDER BY id", (row["id"], user_id)).fetchall()
    result["habits"] = [habit_response(conn, habit) for habit in habit_rows]
    return result


@app.get("/goals")
def read_goals(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, description, target_date, status, created_at, updated_at FROM goals WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (user["id"],),
        ).fetchall()

    return [goal_response(row) for row in rows]


@app.post("/goals")
def create_goal(payload: GoalCreateRequest, user=Depends(get_current_user)):
    title, description, target_date, status = validate_goal_payload(payload)

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO goals (user_id, title, description, target_date, status) VALUES (?, ?, ?, ?, ?)",
            (user["id"], title, description, target_date, status),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, title, description, target_date, status, created_at, updated_at FROM goals WHERE id = ? AND user_id = ?",
            (cursor.lastrowid, user["id"]),
        ).fetchone()

    return goal_response(row)


@app.get("/goals/{goal_id}")
def read_goal(goal_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, title, description, target_date, status, created_at, updated_at FROM goals WHERE id = ? AND user_id = ?",
            (goal_id, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal_detail_response(conn, row, user["id"])


@app.put("/goals/{goal_id}")
def update_goal(goal_id: int, payload: GoalUpdateRequest, user=Depends(get_current_user)):
    title, description, target_date, status = validate_goal_payload(payload)

    with get_db() as conn:
        cursor = conn.execute(
            """
            UPDATE goals
            SET title = ?, description = ?, target_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (title, description, target_date, status, goal_id, user["id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        conn.commit()
        row = conn.execute(
            "SELECT id, title, description, target_date, status, created_at, updated_at FROM goals WHERE id = ? AND user_id = ?",
            (goal_id, user["id"]),
        ).fetchone()

    return goal_response(row)


@app.patch("/goals/{goal_id}/status")
def transition_goal_status(goal_id: int, payload: GoalStatusRequest, user=Depends(get_current_user)):
    status = payload.status.strip().lower()
    if status not in VALID_GOAL_STATUSES:
        raise HTTPException(status_code=400, detail="Goal status must be active, completed, or archived")
    with get_db() as conn:
        cursor = conn.execute(
            "UPDATE goals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (status, goal_id, user["id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        conn.commit()
        row = conn.execute(
            "SELECT id, title, description, target_date, status, created_at, updated_at FROM goals WHERE id = ? AND user_id = ?",
            (goal_id, user["id"]),
        ).fetchone()
    return goal_response(row)


@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        conn.commit()

    return {"ok": True}


@app.get("/search")
def global_search(query: str = "", user=Depends(get_current_user)):
    term = query.strip().lower()
    if not term:
        return {"tasks": [], "goals": [], "habits": []}
    pattern = f"%{term}%"
    with get_db() as conn:
        tasks = conn.execute("SELECT id, title, description, status FROM tasks WHERE user_id = ? AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) ORDER BY id DESC LIMIT 20", (user["id"], pattern, pattern)).fetchall()
        goals = conn.execute("SELECT id, title, description, status FROM goals WHERE user_id = ? AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) ORDER BY id DESC LIMIT 20", (user["id"], pattern, pattern)).fetchall()
        habits = conn.execute("SELECT id, name, kind, active FROM habits WHERE user_id = ? AND LOWER(name) LIKE ? ORDER BY id DESC LIMIT 20", (user["id"], pattern)).fetchall()
    return {"tasks": [dict(row) for row in tasks], "goals": [dict(row) for row in goals], "habits": [dict(row) for row in habits]}


VALID_TASK_STATUSES = {"todo", "in_progress", "blocked", "done"}


def priority_score(priority, due_date, status, subtask_count=0, completed_subtasks=0):
    """Calculate a stable queue score; higher scores should be surfaced first."""
    score = max(1, min(5, int(priority))) * 20
    if due_date:
        try:
            days_until_due = (date.fromisoformat(due_date) - date.today()).days
            if days_until_due < 0:
                score += 45
            elif days_until_due == 0:
                score += 35
            elif days_until_due <= 3:
                score += 20
            elif days_until_due <= 7:
                score += 10
        except ValueError:
            pass
    if status == "in_progress":
        score += 8
    elif status == "blocked":
        score += 4
    if subtask_count and completed_subtasks == subtask_count:
        score -= 20
    return max(0, score)


def subtask_response(row):
    return {"id": row["id"], "task_id": row["task_id"], "title": row["title"], "completed": bool(row["completed"])}


def task_response(row, subtasks=None):
    subtasks = subtasks or []
    completed_subtasks = sum(1 for item in subtasks if item["completed"])
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"] or "",
        "completed": bool(row["completed"]),
        "priority": row["priority"],
        "priority_score": priority_score(row["priority"], row["due_date"], row["status"], len(subtasks), completed_subtasks),
        "due_date": row["due_date"],
        "goal_id": row["goal_id"],
        "status": row["status"],
        "subtasks": [subtask_response(item) for item in subtasks],
    }


def validate_task_payload(payload):
    title = payload.title.strip()
    description = payload.description.strip()
    status = payload.status.strip().lower()
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")
    if status not in VALID_TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Task status must be todo, in_progress, blocked, or done")
    if payload.priority < 1 or payload.priority > 5:
        raise HTTPException(status_code=400, detail="Task priority must be between 1 and 5")
    return title, description, payload.priority, payload.due_date, payload.goal_id, status


def get_task_for_user(conn, task_id, user_id):
    row = conn.execute(
        "SELECT id, title, description, completed, priority, due_date, goal_id, status FROM tasks WHERE id = ? AND user_id = ?",
        (task_id, user_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    subtasks = conn.execute("SELECT id, task_id, title, completed FROM subtasks WHERE task_id = ? ORDER BY id", (task_id,)).fetchall()
    return task_response(row, subtasks)


@app.get("/tasks")
def read_tasks(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, description, completed, priority, due_date, goal_id, status FROM tasks WHERE user_id = ? ORDER BY id",
            (user["id"],),
        ).fetchall()
        return [get_task_for_user(conn, row["id"], user["id"]) for row in rows]


@app.post("/tasks")
def create_task(payload: TaskCreateRequest, user=Depends(get_current_user)):
    title, description, priority, due_date, goal_id, status = validate_task_payload(payload)

    with get_db() as conn:
        if goal_id is not None:
            goal = conn.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone()
            if not goal:
                raise HTTPException(status_code=404, detail="Goal not found")
        cursor = conn.execute(
            "INSERT INTO tasks (user_id, title, description, completed, priority, due_date, goal_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user["id"], title, description, int(payload.completed), priority, due_date, goal_id, status),
        )
        conn.commit()
        return get_task_for_user(conn, cursor.lastrowid, user["id"])


@app.put("/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdateRequest, user=Depends(get_current_user)):
    title, description, priority, due_date, goal_id, status = validate_task_payload(payload)

    with get_db() as conn:
        row = conn.execute("SELECT id FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        if goal_id is not None:
            goal = conn.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone()
            if not goal:
                raise HTTPException(status_code=404, detail="Goal not found")

        conn.execute(
            "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ?, goal_id = ?, status = ? WHERE id = ? AND user_id = ?",
            (title, description, int(payload.completed), priority, due_date, goal_id, status, task_id, user["id"]),
        )
        conn.commit()
        return get_task_for_user(conn, task_id, user["id"])


@app.patch("/tasks/{task_id}/status")
def transition_task_status(task_id: int, payload: TaskStatusRequest, user=Depends(get_current_user)):
    status = payload.status.strip().lower()
    if status not in VALID_TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Task status must be todo, in_progress, blocked, or done")
    with get_db() as conn:
        conn.execute(
            "UPDATE tasks SET status = ?, completed = ? WHERE id = ? AND user_id = ?",
            (status, int(status == "done"), task_id, user["id"]),
        )
        conn.commit()
        return get_task_for_user(conn, task_id, user["id"])


@app.get("/tasks/priority-queue")
def read_priority_queue(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, description, completed, priority, due_date, goal_id, status FROM tasks WHERE user_id = ? AND status != 'done'",
            (user["id"],),
        ).fetchall()
        tasks = [get_task_for_user(conn, row["id"], user["id"]) for row in rows]
    return sorted(tasks, key=lambda task: (-task["priority_score"], task["due_date"] or "9999-12-31", task["id"]))


@app.patch("/tasks/{task_id}/priority")
def override_task_priority(task_id: int, payload: TaskPriorityRequest, user=Depends(get_current_user)):
    if payload.priority < 1 or payload.priority > 5:
        raise HTTPException(status_code=400, detail="Priority must be between 1 and 5")
    with get_db() as conn:
        conn.execute("UPDATE tasks SET priority = ? WHERE id = ? AND user_id = ?", (payload.priority, task_id, user["id"]))
        conn.commit()
        return get_task_for_user(conn, task_id, user["id"])


@app.get("/tasks/{task_id}")
def read_task(task_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        return get_task_for_user(conn, task_id, user["id"])


@app.get("/tasks/{task_id}/subtasks")
def read_subtasks(task_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        get_task_for_user(conn, task_id, user["id"])
        rows = conn.execute("SELECT id, task_id, title, completed FROM subtasks WHERE task_id = ? ORDER BY id", (task_id,)).fetchall()
    return [subtask_response(row) for row in rows]


@app.post("/tasks/{task_id}/subtasks")
def create_subtask(task_id: int, payload: SubtaskCreateRequest, user=Depends(get_current_user)):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Subtask title is required")
    with get_db() as conn:
        get_task_for_user(conn, task_id, user["id"])
        cursor = conn.execute("INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?)", (task_id, title, int(payload.completed)))
        conn.commit()
        row = conn.execute("SELECT id, task_id, title, completed FROM subtasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return subtask_response(row)


@app.put("/tasks/{task_id}/subtasks/{subtask_id}")
def update_subtask(task_id: int, subtask_id: int, payload: SubtaskUpdateRequest, user=Depends(get_current_user)):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Subtask title is required")
    with get_db() as conn:
        get_task_for_user(conn, task_id, user["id"])
        cursor = conn.execute("UPDATE subtasks SET title = ?, completed = ? WHERE id = ? AND task_id = ?", (title, int(payload.completed), subtask_id, task_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Subtask not found")
        conn.commit()
        row = conn.execute("SELECT id, task_id, title, completed FROM subtasks WHERE id = ?", (subtask_id,)).fetchone()
    return subtask_response(row)


@app.delete("/tasks/{task_id}/subtasks/{subtask_id}")
def delete_subtask(task_id: int, subtask_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        get_task_for_user(conn, task_id, user["id"])
        cursor = conn.execute("DELETE FROM subtasks WHERE id = ? AND task_id = ?", (subtask_id, task_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Subtask not found")
        conn.commit()
    return {"ok": True}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        conn.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"]))
        conn.commit()

    return {"ok": True}


VALID_HABIT_KINDS = {"build", "reduce"}


def get_habit_or_404(conn, habit_id, user_id):
    habit = conn.execute("SELECT * FROM habits WHERE id = ? AND user_id = ?", (habit_id, user_id)).fetchone()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


def calculate_streak(log_dates):
    dates = {date.fromisoformat(value) for value in log_dates}
    streak = 0
    cursor = date.today()
    while cursor in dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def habit_response(conn, row):
    today = date.today().isoformat()
    logs = conn.execute("SELECT logged_on, completed, amount FROM habit_logs WHERE habit_id = ? ORDER BY logged_on DESC", (row["id"],)).fetchall()
    today_log = next((log for log in logs if log["logged_on"] == today), None)
    plan = conn.execute("SELECT * FROM reduction_plans WHERE habit_id = ?", (row["id"],)).fetchone()
    return {
        "id": row["id"], "name": row["name"], "frequency": row["frequency"], "target": row["target"],
        "active": bool(row["active"]), "kind": row["kind"], "goal_id": row["goal_id"], "unit": row["unit"],
        "completed_today": bool(today_log["completed"]) if today_log else False,
        "amount_today": today_log["amount"] if today_log else 0,
        "streak": calculate_streak([log["logged_on"] for log in logs if log["completed"]]),
        "reduction_plan": dict(plan) if plan else None,
    }


def validate_habit_payload(payload):
    name = payload.name.strip()
    kind = payload.kind.strip().lower()
    if not name or payload.target < 1:
        raise HTTPException(status_code=400, detail="Habit name and a positive target are required")
    if kind not in VALID_HABIT_KINDS:
        raise HTTPException(status_code=400, detail="Habit kind must be build or reduce")
    return name, payload.frequency.strip().lower(), payload.target, kind, payload.goal_id, payload.unit.strip() or "times"


@app.get("/habits")
def read_habits(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY id", (user["id"],)).fetchall()
        return [habit_response(conn, row) for row in rows]


@app.post("/habits")
def create_habit(payload: HabitCreateRequest, user=Depends(get_current_user)):
    name, frequency, target, kind, goal_id, unit = validate_habit_payload(payload)
    with get_db() as conn:
        if goal_id is not None and not conn.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone():
            raise HTTPException(status_code=404, detail="Goal not found")
        cursor = conn.execute("INSERT INTO habits (user_id, name, frequency, target, kind, goal_id, unit) VALUES (?, ?, ?, ?, ?, ?, ?)", (user["id"], name, frequency, target, kind, goal_id, unit))
        conn.commit()
        row = conn.execute("SELECT * FROM habits WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return habit_response(conn, row)


@app.get("/habits/{habit_id}")
def read_habit(habit_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        return habit_response(conn, get_habit_or_404(conn, habit_id, user["id"]))


@app.put("/habits/{habit_id}")
def update_habit(habit_id: int, payload: HabitUpdateRequest, user=Depends(get_current_user)):
    name, frequency, target, kind, goal_id, unit = validate_habit_payload(payload)
    with get_db() as conn:
        get_habit_or_404(conn, habit_id, user["id"])
        if goal_id is not None and not conn.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone():
            raise HTTPException(status_code=404, detail="Goal not found")
        conn.execute("UPDATE habits SET name = ?, frequency = ?, target = ?, active = ?, kind = ?, goal_id = ?, unit = ? WHERE id = ? AND user_id = ?", (name, frequency, target, int(payload.active), kind, goal_id, unit, habit_id, user["id"]))
        conn.commit()
        return habit_response(conn, get_habit_or_404(conn, habit_id, user["id"]))


@app.delete("/habits/{habit_id}")
def delete_habit(habit_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        get_habit_or_404(conn, habit_id, user["id"])
        conn.execute("DELETE FROM habits WHERE id = ? AND user_id = ?", (habit_id, user["id"]))
        conn.commit()
    return {"ok": True}


@app.post("/habits/{habit_id}/check-in")
def check_in_habit(habit_id: int, payload: HabitCheckinRequest, user=Depends(get_current_user)):
    today = date.today().isoformat()
    with get_db() as conn:
        habit = get_habit_or_404(conn, habit_id, user["id"])
        conn.execute("INSERT INTO habit_logs (habit_id, user_id, logged_on, completed, amount) VALUES (?, ?, ?, ?, ?) ON CONFLICT(habit_id, logged_on) DO UPDATE SET completed = excluded.completed, amount = excluded.amount", (habit_id, user["id"], today, int(payload.completed), habit["target"] if payload.completed else 0))
        conn.execute("INSERT INTO habit_checkins (habit_id, completed_on, completed) VALUES (?, ?, ?) ON CONFLICT(habit_id, completed_on) DO UPDATE SET completed = excluded.completed", (habit_id, today, int(payload.completed)))
        conn.commit()
        return habit_response(conn, habit)


@app.get("/habits/{habit_id}/logs")
def read_habit_logs(habit_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        get_habit_or_404(conn, habit_id, user["id"])
        rows = conn.execute("SELECT id, logged_on, completed, amount, note FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY logged_on DESC", (habit_id, user["id"])).fetchall()
    return [dict(row) for row in rows]


@app.post("/habits/{habit_id}/logs")
def create_habit_log(habit_id: int, payload: UsageLogRequest, user=Depends(get_current_user)):
    logged_on = payload.logged_on or date.today().isoformat()
    with get_db() as conn:
        get_habit_or_404(conn, habit_id, user["id"])
        conn.execute("INSERT INTO habit_logs (habit_id, user_id, logged_on, completed, amount, note) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(habit_id, logged_on) DO UPDATE SET completed = excluded.completed, amount = excluded.amount, note = excluded.note", (habit_id, user["id"], logged_on, int(payload.amount > 0), payload.amount, payload.note.strip()))
        conn.commit()
        row = conn.execute("SELECT id, logged_on, completed, amount, note FROM habit_logs WHERE habit_id = ? AND logged_on = ?", (habit_id, logged_on)).fetchone()
    return dict(row)


@app.post("/habits/{habit_id}/reduction-plan")
def save_reduction_plan(habit_id: int, payload: ReductionPlanRequest, user=Depends(get_current_user)):
    if payload.baseline < 0 or payload.target < 0 or payload.target > payload.baseline:
        raise HTTPException(status_code=400, detail="Reduction target must be between zero and the baseline")
    with get_db() as conn:
        habit = get_habit_or_404(conn, habit_id, user["id"])
        if habit["kind"] != "reduce":
            raise HTTPException(status_code=400, detail="Reduction plans require a reduce habit")
        conn.execute("INSERT INTO reduction_plans (habit_id, baseline, target, strategy, triggers, replacement, unit) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(habit_id) DO UPDATE SET baseline = excluded.baseline, target = excluded.target, strategy = excluded.strategy, triggers = excluded.triggers, replacement = excluded.replacement, unit = excluded.unit, updated_at = CURRENT_TIMESTAMP", (habit_id, payload.baseline, payload.target, payload.strategy.strip(), payload.triggers.strip(), payload.replacement.strip(), payload.unit.strip() or "times"))
        conn.commit()
        plan = conn.execute("SELECT * FROM reduction_plans WHERE habit_id = ?", (habit_id,)).fetchone()
    return dict(plan)


@app.get("/habits/{habit_id}/reduction-trend")
def reduction_trend(habit_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        habit = get_habit_or_404(conn, habit_id, user["id"])
        plan = conn.execute("SELECT * FROM reduction_plans WHERE habit_id = ?", (habit_id,)).fetchone()
        if not plan:
            raise HTTPException(status_code=404, detail="Reduction plan not found")
        rows = conn.execute("SELECT logged_on, amount FROM reduction_usage_logs WHERE plan_id = ? AND user_id = ? ORDER BY logged_on", (plan["id"], user["id"])).fetchall()
    average = sum(row["amount"] for row in rows) / len(rows) if rows else 0
    reduction_percent = max(0, round((plan["baseline"] - average) / plan["baseline"] * 100)) if plan["baseline"] else 0
    return {"habit": dict(habit), "plan": dict(plan), "reduction_percent": reduction_percent, "average": average, "trend": [dict(row) for row in rows], "recovery_suggestion": "Notice the trigger, use your replacement strategy, and log the next choice without judgment." if average > plan["target"] else "Your usage is at or below target. Keep your replacement strategy close."}


@app.post("/habits/{habit_id}/reduction-usage")
def log_reduction_usage(habit_id: int, payload: UsageLogRequest, user=Depends(get_current_user)):
    logged_on = payload.logged_on or date.today().isoformat()
    with get_db() as conn:
        get_habit_or_404(conn, habit_id, user["id"])
        plan = conn.execute("SELECT id FROM reduction_plans WHERE habit_id = ?", (habit_id,)).fetchone()
        if not plan:
            raise HTTPException(status_code=404, detail="Reduction plan not found")
        conn.execute("INSERT INTO reduction_usage_logs (plan_id, user_id, logged_on, amount, note) VALUES (?, ?, ?, ?, ?) ON CONFLICT(plan_id, logged_on) DO UPDATE SET amount = excluded.amount, note = excluded.note", (plan["id"], user["id"], logged_on, payload.amount, payload.note.strip()))
        conn.commit()
    return reduction_trend(habit_id, user)


def analytics_week_start(value=None):
    current = value or date.today()
    return (current - timedelta(days=current.weekday())).isoformat()


def calculate_analytics(conn, user_id, progress_date):
    task_rows = conn.execute("SELECT status, due_date FROM tasks WHERE user_id = ?", (user_id,)).fetchall()
    completed_tasks = sum(1 for task in task_rows if task["status"] == "done")
    completion_rate = round(completed_tasks / len(task_rows) * 100, 1) if task_rows else 0
    postponements = sum(1 for task in task_rows if task["due_date"] and task["due_date"] < progress_date and task["status"] != "done")
    build_habits = conn.execute("SELECT id FROM habits WHERE user_id = ? AND kind = 'build' AND active = 1", (user_id,)).fetchall()
    habit_logs = conn.execute("SELECT habit_id, logged_on, completed, created_at FROM habit_logs WHERE user_id = ? AND logged_on BETWEEN ? AND date(?, '+6 day')", (user_id, progress_date, progress_date)).fetchall()
    logged_habits = {log["habit_id"] for log in habit_logs if log["completed"]}
    weekend_misses = 0
    for offset in (5, 6):
        weekend_day = date.fromisoformat(progress_date) + timedelta(days=offset)
        if weekend_day <= date.today():
            weekend_misses += sum(1 for habit in build_habits if not any(log["habit_id"] == habit["id"] and log["logged_on"] == weekend_day.isoformat() and log["completed"] for log in habit_logs))
    reduction_rows = conn.execute("SELECT r.amount, p.baseline FROM reduction_usage_logs r JOIN reduction_plans p ON p.id = r.plan_id WHERE r.user_id = ? AND r.logged_on BETWEEN ? AND date(?, '+6 day')", (user_id, progress_date, progress_date)).fetchall()
    reduction_percent = 0
    if reduction_rows:
        baseline = sum(row["baseline"] for row in reduction_rows)
        average_usage = sum(row["amount"] for row in reduction_rows)
        reduction_percent = round(max(0, (baseline - average_usage) / baseline * 100), 1) if baseline else 0
    windows = {}
    for log in habit_logs:
        try:
            hour = datetime.fromisoformat(log["created_at"]).hour
            label = "morning" if hour < 12 else "afternoon" if hour < 18 else "evening"
            windows[label] = windows.get(label, 0) + int(log["completed"])
        except (TypeError, ValueError):
            pass
    best_window = max(windows, key=windows.get) if windows else ""
    task_score = round(completion_rate, 1)
    habit_score = round(len(logged_habits) / len(build_habits) * 100, 1) if build_habits else 0
    return {
        "completion_rate": completion_rate,
        "task_score": task_score,
        "habit_score": habit_score,
        "reduction_percent": reduction_percent,
        "best_performance_window": best_window,
        "postponements": postponements,
        "weekend_habit_misses": weekend_misses,
        "total_score": round((task_score + habit_score + reduction_percent) / 3, 1),
    }


@app.post("/analytics/run")
def run_analytics(user=Depends(get_current_user)):
    week_start = analytics_week_start()
    with get_db() as conn:
        daily_rows = []
        for offset in range(7):
            progress_date = date.fromisoformat(week_start) + timedelta(days=offset)
            metrics = calculate_analytics(conn, user["id"], progress_date.isoformat())
            conn.execute("INSERT INTO daily_progress (user_id, progress_date, completion_rate, task_score, habit_score, reduction_percent, best_performance_window, postponements, weekend_habit_misses, total_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, progress_date) DO UPDATE SET completion_rate = excluded.completion_rate, task_score = excluded.task_score, habit_score = excluded.habit_score, reduction_percent = excluded.reduction_percent, best_performance_window = excluded.best_performance_window, postponements = excluded.postponements, weekend_habit_misses = excluded.weekend_habit_misses, total_score = excluded.total_score", (user["id"], progress_date.isoformat(), metrics["completion_rate"], metrics["task_score"], metrics["habit_score"], metrics["reduction_percent"], metrics["best_performance_window"], metrics["postponements"], metrics["weekend_habit_misses"], metrics["total_score"]))
            daily_rows.append({"date": progress_date.isoformat(), **metrics})
        average_score = round(sum(row["total_score"] for row in daily_rows) / 7, 1)
        weekly = {"week_start": week_start, "completion_rate": round(sum(row["completion_rate"] for row in daily_rows) / 7, 1), "average_score": average_score, "reduction_percent": round(sum(row["reduction_percent"] for row in daily_rows) / 7, 1), "best_performance_window": max((row["best_performance_window"] for row in daily_rows), key=lambda item: sum(1 for current in daily_rows if current["best_performance_window"] == item), default=""), "postponements": sum(row["postponements"] for row in daily_rows), "weekend_habit_misses": sum(row["weekend_habit_misses"] for row in daily_rows)}
        conn.execute("INSERT INTO weekly_progress (user_id, week_start, completion_rate, average_score, reduction_percent, best_performance_window, postponements, weekend_habit_misses) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, week_start) DO UPDATE SET completion_rate = excluded.completion_rate, average_score = excluded.average_score, reduction_percent = excluded.reduction_percent, best_performance_window = excluded.best_performance_window, postponements = excluded.postponements, weekend_habit_misses = excluded.weekend_habit_misses", (user["id"], week_start, weekly["completion_rate"], weekly["average_score"], weekly["reduction_percent"], weekly["best_performance_window"], weekly["postponements"], weekly["weekend_habit_misses"]))
        conn.execute("DELETE FROM insights WHERE user_id = ? AND week_start = ?", (user["id"], week_start))
        if weekly["completion_rate"] < 60:
            conn.execute("INSERT INTO insights (user_id, week_start, kind, title, body) VALUES (?, ?, ?, ?, ?)", (user["id"], week_start, "pattern", "Completion dipped", "A smaller task batch may make your daily finish line easier to reach."))
        if weekly["best_performance_window"]:
            conn.execute("INSERT INTO insights (user_id, week_start, kind, title, body) VALUES (?, ?, ?, ?, ?)", (user["id"], week_start, "win", "Your best window is clear", f"You complete the most habit activity in the {weekly['best_performance_window']}.") )
        if weekly["weekend_habit_misses"]:
            conn.execute("INSERT INTO insights (user_id, week_start, kind, title, body) VALUES (?, ?, ?, ?, ?)", (user["id"], week_start, "pattern", "Weekend consistency needs support", "Consider a smaller weekend version of your habit."))
        conn.execute("DELETE FROM recommendations WHERE user_id = ? AND week_start = ? AND status = 'pending'", (user["id"], week_start))
        candidates = conn.execute("SELECT id, title FROM tasks WHERE user_id = ? AND status != 'done' AND priority >= 4 AND id NOT IN (SELECT task_id FROM subtasks)", (user["id"],)).fetchall()
        for task in candidates:
            parts = [f"Clarify the outcome for {task['title']}", f"Do the smallest first step for {task['title']}", f"Review and close {task['title']}"]
            conn.execute("INSERT INTO recommendations (user_id, week_start, kind, title, description, payload) VALUES (?, ?, ?, ?, ?, ?)", (user["id"], week_start, "split_task", f"Split {task['title']}", "Turn this high-priority task into three smaller actions.", json.dumps({"task_id": task["id"], "parts": parts})))
        conn.commit()
    return {"week_start": week_start, "daily": daily_rows, "weekly": weekly}


@app.get("/progress")
def read_progress(user=Depends(get_current_user)):
    run_analytics(user)
    week_start = analytics_week_start()
    with get_db() as conn:
        daily = conn.execute("SELECT progress_date AS date, completion_rate, task_score, habit_score, reduction_percent, best_performance_window, postponements, weekend_habit_misses, total_score FROM daily_progress WHERE user_id = ? AND progress_date BETWEEN ? AND date(?, '+6 day') ORDER BY progress_date", (user["id"], week_start, week_start)).fetchall()
        weekly = conn.execute("SELECT week_start, completion_rate, average_score, reduction_percent, best_performance_window, postponements, weekend_habit_misses FROM weekly_progress WHERE user_id = ? AND week_start = ?", (user["id"], week_start)).fetchone()
    return {"daily": [dict(row) for row in daily], "weekly": dict(weekly) if weekly else None}


@app.get("/insights")
def read_insights(user=Depends(get_current_user)):
    run_analytics(user)
    with get_db() as conn:
        rows = conn.execute("SELECT id, kind, title, body, status, created_at FROM insights WHERE user_id = ? ORDER BY id DESC", (user["id"],)).fetchall()
    return [dict(row) for row in rows]


@app.get("/recommendations")
def read_recommendations(user=Depends(get_current_user)):
    run_analytics(user)
    with get_db() as conn:
        rows = conn.execute("SELECT id, kind, title, description, payload, status, created_at FROM recommendations WHERE user_id = ? ORDER BY id DESC", (user["id"],)).fetchall()
    return [{**dict(row), "payload": json.loads(row["payload"])} for row in rows]


@app.post("/recommendations/{recommendation_id}/apply")
def apply_recommendation(recommendation_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM recommendations WHERE id = ? AND user_id = ?", (recommendation_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        payload = json.loads(row["payload"])
        if row["kind"] == "split_task":
            task = get_task_for_user(conn, payload["task_id"], user["id"])
            for part in payload["parts"]:
                conn.execute("INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, 0)", (task["id"], part))
        conn.execute("UPDATE recommendations SET status = 'applied' WHERE id = ?", (recommendation_id,))
        conn.commit()
    return {"ok": True, "status": "applied"}


@app.post("/recommendations/{recommendation_id}/ignore")
def ignore_recommendation(recommendation_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.execute("UPDATE recommendations SET status = 'ignored' WHERE id = ? AND user_id = ?", (recommendation_id, user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        conn.commit()
    return {"ok": True, "status": "ignored"}


@app.get("/weekly-reviews")
def read_weekly_reviews(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT id, week_start, wins, blockers, next_focus, rating, submitted_at FROM weekly_reviews WHERE user_id = ? ORDER BY week_start DESC", (user["id"],)).fetchall()
    return [dict(row) for row in rows]


@app.post("/weekly-reviews")
def submit_weekly_review(payload: WeeklyReviewRequest, user=Depends(get_current_user)):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Review rating must be between 1 and 5")
    with get_db() as conn:
        conn.execute("INSERT INTO weekly_reviews (user_id, week_start, wins, blockers, next_focus, rating) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, week_start) DO UPDATE SET wins = excluded.wins, blockers = excluded.blockers, next_focus = excluded.next_focus, rating = excluded.rating, submitted_at = CURRENT_TIMESTAMP", (user["id"], payload.week_start, payload.wins.strip(), payload.blockers.strip(), payload.next_focus.strip(), payload.rating))
        conn.commit()
        row = conn.execute("SELECT id, week_start, wins, blockers, next_focus, rating, submitted_at FROM weekly_reviews WHERE user_id = ? AND week_start = ?", (user["id"], payload.week_start)).fetchone()
    return dict(row)

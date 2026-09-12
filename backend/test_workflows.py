import os
import tempfile
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_PATH"] = os.path.join(tempfile.gettempdir(), f"taskflow-test-{uuid.uuid4().hex}.db")
from main import app, on_startup, priority_score


@pytest.fixture
def client():
    on_startup()
    with TestClient(app) as test_client:
        response = test_client.post("/auth/signup", json={"full_name": "Test User", "email": f"{uuid.uuid4().hex}@example.com", "password": "password123"})
        token = response.json()["token"]
        test_client.headers.update({"Authorization": f"Bearer {token}"})
        yield test_client


def test_priority_score_prefers_urgent_tasks():
    assert priority_score(5, date.today().isoformat(), "todo") > priority_score(3, None, "todo")


def test_task_goal_subtask_and_search_flow(client):
    goal = client.post("/goals", json={"title": "Ship release"}).json()
    task = client.post("/tasks", json={"title": "Prepare release", "priority": 5, "due_date": date.today().isoformat(), "goal_id": goal["id"]}).json()
    assert task["priority_score"] >= 100
    subtask = client.post(f"/tasks/{task['id']}/subtasks", json={"title": "Write notes"})
    assert subtask.status_code == 200
    results = client.get("/search", params={"query": "release"}).json()
    assert results["tasks"][0]["id"] == task["id"]
    assert client.patch(f"/tasks/{task['id']}/priority", json={"priority": 2}).json()["priority"] == 2


def test_habit_and_reduction_tracking_flow(client):
    build = client.post("/habits", json={"name": "Read", "kind": "build"}).json()
    assert client.post(f"/habits/{build['id']}/logs", json={"amount": 1}).status_code == 200
    assert client.get(f"/habits/{build['id']}").json()["streak"] == 1
    reduce = client.post("/habits", json={"name": "Scrolling", "kind": "reduce"}).json()
    plan = client.post(f"/habits/{reduce['id']}/reduction-plan", json={"baseline": 10, "target": 5, "strategy": "Delay", "replacement": "Walk"})
    assert plan.status_code == 200
    trend = client.post(f"/habits/{reduce['id']}/reduction-usage", json={"amount": 4}).json()
    assert trend["reduction_percent"] == 60


def test_analytics_and_review_flow(client):
    assert client.get("/progress").status_code == 200
    assert client.get("/insights").status_code == 200
    assert client.get("/recommendations").status_code == 200
    review = client.post("/weekly-reviews", json={"week_start": "2026-09-07", "wins": " shipped", "rating": 4})
    assert review.status_code == 200
    assert review.json()["rating"] == 4

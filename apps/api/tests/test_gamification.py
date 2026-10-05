from fastapi.testclient import TestClient


def test_user_progress_default(client: TestClient) -> None:
    response = client.get("/api/v1/user/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["total_xp"] == 0
    assert data["current_level"] == 1
    assert data["current_streak"] == 0
    assert data["last_practice_date"] is None


def test_create_practice_session(client: TestClient) -> None:
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={"name": "Gamification Project"})
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Record first practice session
    session_res = client.post(
        "/api/v1/practice-sessions",
        json={
            "project_id": project_id,
            "score": 100,
            "accuracy_percent": 90.0,
        },
    )
    assert session_res.status_code == 200
    s_data = session_res.json()
    assert s_data["score"] == 100
    assert s_data["accuracy_percent"] == 90.0
    assert s_data["xp_gained"] == 90  # 100 * 0.9
    assert s_data["total_xp"] == 90
    assert s_data["current_level"] == 1
    assert s_data["current_streak"] == 1
    assert s_data["level_up"] is False

    # 3. Check progress reflects the practice session
    progress_res = client.get("/api/v1/user/progress")
    assert progress_res.status_code == 200
    p_data = progress_res.json()
    assert p_data["total_xp"] == 90
    assert p_data["current_level"] == 1
    assert p_data["current_streak"] == 1
    assert p_data["last_practice_date"] is not None

    # 4. Record second practice session triggering level up
    session_res2 = client.post(
        "/api/v1/practice-sessions",
        json={
            "project_id": project_id,
            "score": 200,
            "accuracy_percent": 100.0,
        },
    )
    assert session_res2.status_code == 200
    s_data2 = session_res2.json()
    assert s_data2["xp_gained"] == 200
    assert s_data2["total_xp"] == 290
    assert s_data2["current_level"] == 3  # (290 // 100) + 1
    assert s_data2["level_up"] is True
    # Same-day practice preserves streak
    assert s_data2["current_streak"] == 1

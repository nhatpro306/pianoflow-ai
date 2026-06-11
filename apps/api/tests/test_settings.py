"""Settings v2 endpoint tests: defaults, presets, custom colors, validation."""

from fastapi.testclient import TestClient


def _project(client: TestClient) -> str:
    return client.post("/api/v1/projects", json={"name": "Settings Test"}).json()["id"]


def test_defaults_lazily_created(client: TestClient) -> None:
    pid = _project(client)
    response = client.get(f"/api/v1/projects/{pid}/settings")
    assert response.status_code == 200
    body = response.json()
    assert body["theme_preset"] == "classic"
    assert body["colors"]["right_hand"] == "#7c3aed"
    assert body["speed_multiplier"] == 1.0
    assert body["fps"] == 30
    assert body["version"] == 1


def test_preset_fills_colors_server_side(client: TestClient) -> None:
    pid = _project(client)
    response = client.patch(f"/api/v1/projects/{pid}/settings", json={"theme_preset": "gold"})
    body = response.json()
    assert body["theme_preset"] == "gold"
    assert body["colors"]["right_hand"] == "#f59e0b"
    assert body["version"] == 2


def test_custom_colors_flip_preset_to_custom(client: TestClient) -> None:
    pid = _project(client)
    colors = {
        "right_hand": "#112233",
        "left_hand": "#445566",
        "key_highlight": "#778899",
        "glow": "#aabbcc",
        "hit_effect": "#ddeeff",
        "background": "#000000",
    }
    body = client.patch(f"/api/v1/projects/{pid}/settings", json={"colors": colors}).json()
    assert body["theme_preset"] == "custom"
    assert body["colors"] == colors


def test_reset_to_default_via_classic_preset(client: TestClient) -> None:
    pid = _project(client)
    client.patch(f"/api/v1/projects/{pid}/settings", json={"theme_preset": "neon"})
    body = client.patch(f"/api/v1/projects/{pid}/settings", json={"theme_preset": "classic"}).json()
    assert body["colors"]["right_hand"] == "#7c3aed"


def test_invalid_hex_rejected(client: TestClient) -> None:
    pid = _project(client)
    colors = {
        key: "#112233"
        for key in ("right_hand", "left_hand", "key_highlight", "glow", "hit_effect", "background")
    }
    colors["glow"] = "purple"
    response = client.patch(f"/api/v1/projects/{pid}/settings", json={"colors": colors})
    assert response.status_code == 422  # pydantic validation error


def test_speed_bounds_enforced(client: TestClient) -> None:
    pid = _project(client)
    ok = client.patch(f"/api/v1/projects/{pid}/settings", json={"speed_multiplier": 0.25})
    assert ok.status_code == 200
    too_fast = client.patch(f"/api/v1/projects/{pid}/settings", json={"speed_multiplier": 2.5})
    assert too_fast.status_code == 422
    too_slow = client.patch(f"/api/v1/projects/{pid}/settings", json={"speed_multiplier": 0.1})
    assert too_slow.status_code == 422


def test_unknown_preset_rejected(client: TestClient) -> None:
    pid = _project(client)
    response = client.patch(f"/api/v1/projects/{pid}/settings", json={"theme_preset": "vaporwave"})
    assert response.status_code == 422


def test_version_bumps_per_patch(client: TestClient) -> None:
    pid = _project(client)
    client.get(f"/api/v1/projects/{pid}/settings")
    v2 = client.patch(f"/api/v1/projects/{pid}/settings", json={"fps": 60}).json()["version"]
    v3 = client.patch(f"/api/v1/projects/{pid}/settings", json={"glow_intensity": 0.9}).json()[
        "version"
    ]
    assert (v2, v3) == (2, 3)


def test_piano_sound_defaults_and_patch(client: TestClient) -> None:
    pid = _project(client)
    defaults = client.get(f"/api/v1/projects/{pid}/settings").json()
    assert defaults["piano_sound"] == "concert_grand"
    assert defaults["volume"] == 0.8
    assert defaults["reverb"] == "light"

    body = client.patch(
        f"/api/v1/projects/{pid}/settings",
        json={"piano_sound": "electric", "volume": 0.5, "reverb": "hall"},
    ).json()
    assert (body["piano_sound"], body["volume"], body["reverb"]) == ("electric", 0.5, "hall")


def test_invalid_piano_sound_and_reverb_rejected(client: TestClient) -> None:
    pid = _project(client)
    assert (
        client.patch(f"/api/v1/projects/{pid}/settings", json={"piano_sound": "kazoo"}).status_code
        == 422
    )
    assert (
        client.patch(f"/api/v1/projects/{pid}/settings", json={"reverb": "cathedral"}).status_code
        == 422
    )
    assert client.patch(f"/api/v1/projects/{pid}/settings", json={"volume": 1.5}).status_code == 422


def test_cross_user_isolation_404(client: TestClient) -> None:
    response = client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000/settings")
    assert response.status_code == 404

"""Remote control session endpoints.

Ephemeral Redis sessions let a phone control FallingNotePreview on a desktop
browser. The random token IS the access control — no JWT required.
Sessions expire after 4 hours.
"""
import json
import secrets
import time
from typing import Literal

import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings

router = APIRouter(prefix="/api/v1", tags=["remote"])

_TTL = 4 * 3600  # 4 hours


def _get_redis(settings: Settings = Depends(get_settings)) -> redis_lib.Redis:
    if settings.queue_backend == "memory":
        raise HTTPException(status_code=503, detail="Remote control requires Redis.")
    try:
        return redis_lib.Redis.from_url(settings.redis_url, decode_responses=True)
    except redis_lib.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable.") from exc


def _key(token: str) -> str:
    return f"pianoflow:remote:{token}"


class RemoteSessionOut(BaseModel):
    token: str
    seq: int
    action: str | None = None
    value: float | None = None
    expires_in_seconds: int


class RemoteCommandIn(BaseModel):
    action: Literal["play", "pause", "restart", "seek_fwd", "seek_back", "speed"]
    value: float | None = None


class RemoteCommandOut(BaseModel):
    seq: int


@router.post("/remote-sessions", response_model=RemoteSessionOut, status_code=201)
def create_remote_session(r: redis_lib.Redis = Depends(_get_redis)) -> RemoteSessionOut:
    token = secrets.token_urlsafe(12)
    data: dict = {"seq": 0, "action": None, "value": None, "created_at": time.time()}
    try:
        r.setex(_key(token), _TTL, json.dumps(data))
    except redis_lib.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable.") from exc
    return RemoteSessionOut(token=token, seq=0, expires_in_seconds=_TTL)


@router.get("/remote-sessions/{token}", response_model=RemoteSessionOut)
def get_remote_session(
    token: str, r: redis_lib.Redis = Depends(_get_redis)
) -> RemoteSessionOut:
    key = _key(token)
    try:
        raw = r.get(key)
        ttl = r.ttl(key)
    except redis_lib.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable.") from exc
    if raw is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    data = json.loads(raw)
    return RemoteSessionOut(
        token=token,
        seq=data.get("seq", 0),
        action=data.get("action"),
        value=data.get("value"),
        expires_in_seconds=max(0, ttl),
    )


@router.post("/remote-sessions/{token}/command", response_model=RemoteCommandOut)
def send_command(
    token: str,
    cmd: RemoteCommandIn,
    r: redis_lib.Redis = Depends(_get_redis),
) -> RemoteCommandOut:
    key = _key(token)
    try:
        raw = r.get(key)
    except redis_lib.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable.") from exc
    if raw is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    data = json.loads(raw)
    data["seq"] = data.get("seq", 0) + 1
    data["action"] = cmd.action
    data["value"] = cmd.value
    ttl = r.ttl(key)
    try:
        r.setex(key, max(1, ttl), json.dumps(data))
    except redis_lib.RedisError as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable.") from exc
    return RemoteCommandOut(seq=data["seq"])

"""
Redis Cache Service — persistent cache for ML results, API responses, and heatmap data.
Falls back to in-memory dict if Redis is unavailable.
"""
import json
import logging
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

_redis_client = None
_memory_fallback: dict = {}
_initialized = False


def _get_redis():
    global _redis_client, _initialized
    if _initialized:
        return _redis_client
    _initialized = True
    try:
        import redis
        settings = get_settings()
        url = settings.redis_url
        if not url:
            logger.info("No REDIS_URL configured — using in-memory cache")
            return None
        _redis_client = redis.from_url(url, decode_responses=True, socket_timeout=3)
        _redis_client.ping()
        logger.info("Redis connected successfully")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis unavailable ({e}) — using in-memory cache")
        _redis_client = None
        return None


def get(key: str) -> Optional[dict]:
    """Get a cached value. Returns None if not found."""
    r = _get_redis()
    if r:
        try:
            val = r.get(f"satintel:{key}")
            if val:
                return json.loads(val)
        except Exception:
            pass
    return _memory_fallback.get(key)


def set(key: str, value, ttl: int = 86400):
    """Cache a value. Default TTL = 24 hours."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"satintel:{key}", ttl, json.dumps(value, default=str))
        except Exception:
            pass
    _memory_fallback[key] = value


def delete(key: str):
    """Delete a cached value."""
    r = _get_redis()
    if r:
        try:
            r.delete(f"satintel:{key}")
        except Exception:
            pass
    _memory_fallback.pop(key, None)


def clear_city(city: str):
    """Clear all cached data for a city (used after data refresh)."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys(f"satintel:*:{city.lower()}:*")
            keys += r.keys(f"satintel:summary:{city.lower()}")
            keys += r.keys(f"satintel:heatmap:{city.lower()}:*")
            keys += r.keys(f"satintel:timeseries:{city.lower()}:*")
            if keys:
                r.delete(*keys)
                logger.info(f"Cleared {len(keys)} Redis keys for {city}")
        except Exception:
            pass
    # Clear memory fallback for this city
    to_remove = [k for k in _memory_fallback if city.lower() in k.lower()]
    for k in to_remove:
        del _memory_fallback[k]


def set_last_synced():
    """Record the current timestamp as last sync time."""
    from datetime import datetime
    ts = datetime.now().isoformat()
    r = _get_redis()
    if r:
        try:
            r.set("satintel:last_synced", ts)
        except Exception:
            pass
    _memory_fallback["last_synced"] = ts


def get_last_synced() -> Optional[str]:
    """Get the last sync timestamp."""
    r = _get_redis()
    if r:
        try:
            val = r.get("satintel:last_synced")
            if val:
                return val
        except Exception:
            pass
    return _memory_fallback.get("last_synced")


def info() -> dict:
    """Get cache stats."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys("satintel:*")
            return {"backend": "redis", "keys": len(keys), "status": "connected"}
        except Exception:
            return {"backend": "redis", "status": "error"}
    return {"backend": "memory", "keys": len(_memory_fallback), "status": "active"}

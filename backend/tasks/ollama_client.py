import logging
import os
from urllib.parse import urlparse, urlunparse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _windows_host_from_wsl():
    is_wsl = os.path.exists("/proc/sys/fs/binfmt_misc/WSLInterop")
    if not is_wsl:
        try:
            with open("/proc/version", "r", encoding="utf-8") as version_file:
                is_wsl = "microsoft" in version_file.read().lower()
        except OSError:
            is_wsl = False

    if not is_wsl:
        return None

    try:
        with open("/etc/resolv.conf", "r", encoding="utf-8") as resolv_conf:
            for line in resolv_conf:
                parts = line.strip().split()
                if len(parts) == 2 and parts[0] == "nameserver":
                    return parts[1]
    except OSError:
        return None

    return None


def _replace_host(url, host):
    parsed = urlparse(url)
    port = parsed.port
    netloc = f"{host}:{port}" if port else host
    return urlunparse(parsed._replace(netloc=netloc))


def ollama_url_candidates():
    configured_url = settings.OLLAMA_URL.rstrip("/")
    candidates = [configured_url]
    parsed = urlparse(configured_url)

    if parsed.hostname in {"localhost", "127.0.0.1"}:
        candidates.append(_replace_host(configured_url, "host.docker.internal"))
        wsl_host = _windows_host_from_wsl()
        if wsl_host:
            candidates.append(_replace_host(configured_url, wsl_host))

    unique_candidates = []
    for candidate in candidates:
        if candidate and candidate not in unique_candidates:
            unique_candidates.append(candidate)
    return unique_candidates


def generate_with_ollama(payload, timeout):
    last_error = None

    for base_url in ollama_url_candidates():
        try:
            response = requests.post(f"{base_url}/api/generate", json=payload, timeout=timeout)
            if response.status_code >= 400:
                error_detail = response.text
                try:
                    error_detail = response.json().get("error") or error_detail
                except ValueError:
                    pass
                raise requests.exceptions.HTTPError(
                    f"Ollama local API returned {response.status_code} at {base_url}: {error_detail}",
                    response=response,
                )
            if base_url != settings.OLLAMA_URL.rstrip("/"):
                logger.info("Ollama local API reached through fallback URL %s", base_url)
            return response
        except requests.exceptions.HTTPError:
            raise
        except requests.exceptions.RequestException as exc:
            last_error = exc
            logger.debug("Ollama local API failed at %s: %s", base_url, exc)

    raise last_error

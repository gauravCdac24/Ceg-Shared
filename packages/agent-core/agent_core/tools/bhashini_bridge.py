"""Optional BHASHINI translation bridge for agent internet tools (OSS gov API).

Uses ULCA getModelsPipeline (userID + ulcaApiKey) then Dhruva inference callback.
Requires BHASHINI_USER_ID = ULCA My Profile UUID (not the app name).
"""

from __future__ import annotations

import os
from typing import Any

import httpx

ULCA_CONFIG_URL = os.environ.get(
    "BHASHINI_ULCA_CONFIG_URL",
    "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
)
DEFAULT_PIPELINE_ID = os.environ.get("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543cd")


class BhashiniBridgeError(RuntimeError):
    pass


def bhashini_enabled() -> bool:
    return bool(os.environ.get("BHASHINI_API_KEY") and os.environ.get("BHASHINI_USER_ID"))


def _ulca_headers() -> dict[str, str]:
    return {
        "userID": os.environ["BHASHINI_USER_ID"],
        "ulcaApiKey": os.environ["BHASHINI_API_KEY"],
        "Content-Type": "application/json",
    }


def _extract_inference(pipeline_config: dict[str, Any]) -> tuple[str, dict[str, str], str]:
    endpoint = (
        pipeline_config.get("pipelineInferenceAPIEndPoint")
        or pipeline_config.get("inferenceEndPoint")
        or {}
    )
    if not isinstance(endpoint, dict):
        raise BhashiniBridgeError("pipeline config missing inference endpoint")
    url = str(endpoint.get("callbackUrl") or "").strip()
    api_key = endpoint.get("inferenceApiKey") or {}
    if not url or not isinstance(api_key, dict):
        raise BhashiniBridgeError("pipeline config missing callbackUrl/inferenceApiKey")
    name = str(api_key.get("name") or "Authorization")
    value = str(api_key.get("value") or "").strip()
    if not value:
        value = (os.environ.get("BHASHINI_INFERENCE_API_KEY") or "").strip()
    if not value:
        raise BhashiniBridgeError("inference API key missing")
    try:
        service_id = pipeline_config["pipelineResponseConfig"][0]["config"][0]["serviceId"]
    except (KeyError, IndexError, TypeError) as exc:
        raise BhashiniBridgeError("pipeline config missing serviceId") from exc
    return url, {name: value}, str(service_id)


async def _pipeline_config(source_lang: str, target_lang: str) -> dict[str, Any]:
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    }
                },
            }
        ],
        "pipelineRequestConfig": {"pipelineId": DEFAULT_PIPELINE_ID},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(ULCA_CONFIG_URL, json=payload, headers=_ulca_headers())
    if resp.status_code != 200:
        raise BhashiniBridgeError(f"ULCA config HTTP {resp.status_code}")
    data = resp.json()
    if not isinstance(data, dict):
        raise BhashiniBridgeError("Unexpected ULCA config response")
    return data


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    if not text.strip():
        return ""
    if source_lang == target_lang:
        return text.strip()
    if not bhashini_enabled():
        raise BhashiniBridgeError("BHASHINI not configured")

    config = await _pipeline_config(source_lang, target_lang)
    inference_url, auth_header, service_id = _extract_inference(config)
    override = (os.environ.get("BHASHINI_TRANSLATION_SERVICE_ID") or "").strip()
    if override:
        service_id = override
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    },
                    "serviceId": service_id,
                },
            }
        ],
        "inputData": {"input": [{"source": text[:4000]}]},
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(inference_url, json=payload, headers=auth_header)
    if resp.status_code != 200:
        raise BhashiniBridgeError(f"BHASHINI HTTP {resp.status_code}")
    data: dict[str, Any] = resp.json()
    try:
        outputs = data["pipelineResponse"][0]["output"][0]
        return str(outputs.get("target") or outputs.get("targetText") or "").strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise BhashiniBridgeError("Unexpected BHASHINI response") from exc


def detect_hindi_query(text: str) -> bool:
    """Heuristic: Devanagari script present."""
    return any("\u0900" <= ch <= "\u097F" for ch in text)


async def hindi_query_to_english(query: str) -> tuple[str, str]:
    """Return (english_query, original_query)."""
    if not detect_hindi_query(query):
        return query, query
    try:
        en = await translate_text(query, "hi", "en")
    except BhashiniBridgeError:
        return query, query
    return en or query, query

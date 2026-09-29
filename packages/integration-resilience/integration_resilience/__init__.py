"""Integration resilience primitives — outbox, circuit breaker, health registry."""

from integration_resilience.circuit_breaker import (
    HttpCircuitBreaker,
    RedisCircuitStore,
    service_circuit_registry,
)
from integration_resilience.errors import CircuitOpenError, OutboxDeadLetterError
from integration_resilience.health_registry import IntegrationHealthRegistry, InMemoryHealthStore
from integration_resilience.outbox import OutboxStatus, compute_next_attempt_at, default_max_attempts

__all__ = [
    "CircuitOpenError",
    "HttpCircuitBreaker",
    "InMemoryHealthStore",
    "RedisCircuitStore",
    "IntegrationHealthRegistry",
    "OutboxDeadLetterError",
    "OutboxStatus",
    "compute_next_attempt_at",
    "default_max_attempts",
    "service_circuit_registry",
]

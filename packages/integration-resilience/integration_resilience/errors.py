"""Integration resilience errors."""


class CircuitOpenError(RuntimeError):
    """Raised when an HTTP circuit breaker is open for a downstream service."""

    def __init__(self, service_name: str, *, cooldown_sec: float) -> None:
        self.service_name = service_name
        self.cooldown_sec = cooldown_sec
        super().__init__(f"Circuit open for {service_name}; retry after {cooldown_sec}s")


class OutboxDeadLetterError(RuntimeError):
    """Raised when an outbox entry exceeded max delivery attempts."""

    def __init__(self, entry_id: str, target_service: str) -> None:
        self.entry_id = entry_id
        self.target_service = target_service
        super().__init__(f"Outbox entry {entry_id} dead-lettered for {target_service}")

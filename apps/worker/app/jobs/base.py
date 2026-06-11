"""Shared job-control exceptions."""


class RequeueJob(Exception):
    """Handler requests broker redelivery after persisting retry state."""

"""pianoflow_music — pure music-processing core.

Hard rule (CODE_ARCHITECTURE.md §4): zero I/O beyond bytes/paths handed in.
No imports of boto3, supabase, redis, sqlalchemy, requests — ever.
"""

__version__ = "0.1.0"

"""Output access policy (12_NO_TUTORIAL_DOWNLOAD_POLICY).

Kind-based, enforced server-side: tutorial videos are streaming-only and
never get a download URL; analysis JSON is internal by default.
"""

DOWNLOADABLE_KINDS = frozenset(
    {
        "sheet_pdf",
        "sheet_musicxml",
        "original_midi",
        "simplified_midi",
        "transcribed_draft_midi",
    }
)

STREAMING_KINDS = frozenset(
    {
        "video_mp4",
        "vertical_video_mp4",
    }
)


def is_downloadable(kind: str) -> bool:
    return kind in DOWNLOADABLE_KINDS


def is_streamable(kind: str) -> bool:
    return kind in STREAMING_KINDS

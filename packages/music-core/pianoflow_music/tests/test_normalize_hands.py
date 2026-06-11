from pianoflow_music.midi.hands import estimate_hands
from pianoflow_music.midi.normalize import normalize_notes
from pianoflow_music.notes.model import Note


def _note(i: int, pitch: int, start: float = 0.0, dur: float = 0.5, track: int = 0) -> Note:
    return Note(
        id=i,
        pitch=pitch,
        name="x",
        velocity=80,
        start=start,
        end=start + dur,
        duration=dur,
        track=track,
        hand="R",
    )


class TestNormalize:
    def test_drops_zero_duration(self) -> None:
        kept, dropped = normalize_notes([_note(0, 60), _note(1, 62, dur=0.0)])
        assert len(kept) == 1
        assert dropped == 1

    def test_drops_out_of_piano_range(self) -> None:
        kept, dropped = normalize_notes([_note(0, 60), _note(1, 5), _note(2, 120)])
        assert [n.pitch for n in kept] == [60]
        assert dropped == 2

    def test_drops_exact_duplicates(self) -> None:
        kept, dropped = normalize_notes([_note(0, 60), _note(1, 60)])
        assert len(kept) == 1
        assert dropped == 1

    def test_reassigns_contiguous_ids(self) -> None:
        kept, _ = normalize_notes([_note(0, 5), _note(1, 60), _note(2, 64, start=1.0)])
        assert [n.id for n in kept] == [0, 1]


class TestHands:
    def test_two_tracks_use_track_convention(self) -> None:
        notes = [_note(0, 70, track=0), _note(1, 40, track=1)]
        assigned, method = estimate_hands(notes)
        assert method == "tracks"
        assert assigned[0].hand == "R"
        assert assigned[1].hand == "L"

    def test_single_track_pitch_split(self) -> None:
        notes = [_note(0, 72, start=0.0), _note(1, 40, start=1.0)]
        assigned, method = estimate_hands(notes)
        assert method == "pitch_heuristic"
        assert assigned[0].hand == "R"
        assert assigned[1].hand == "L"

    def test_chord_cluster_not_split_across_hands(self) -> None:
        # C major chord straddling middle C: 55, 60, 64 within one octave span,
        # center of mass ≈ 59.7 < 60 → whole chord goes left, never split.
        notes = [_note(0, 55), _note(1, 60), _note(2, 64)]
        assigned, _ = estimate_hands(notes)
        hands = {n.hand for n in assigned}
        assert len(hands) == 1

    def test_wide_cluster_is_split(self) -> None:
        # Two-octave spread cannot be one hand → falls back to per-note split.
        notes = [_note(0, 36), _note(1, 72)]
        assigned, _ = estimate_hands(notes)
        assert assigned[0].hand == "L"
        assert assigned[1].hand == "R"

    def test_empty_notes(self) -> None:
        assigned, method = estimate_hands([])
        assert assigned == []
        assert method == "none"

# PianoFlow AI — UI/UX Specification

## 1. Pages

### Landing Page `/`

Sections:

- hero
- demo preview
- value proposition
- how it works
- target users
- pricing teaser
- compliance-safe note
- CTA

### Auth Pages

Use Supabase Auth UI or custom form:

```text
/sign-in
/sign-up
```

### Dashboard `/projects`

Shows:

- project cards
- status
- source type
- last updated
- create project button

### Upload `/upload`

Tabs:

```text
Upload MIDI
Upload Audio later
Paste Link later
Public Domain Library later
```

MVP only enables MIDI.

### Project Detail `/projects/[id]`

Layout:

```text
left: piano roll / video / sheet preview
right: settings + job status + outputs
```

### Output Page `/projects/[id]/outputs`

Shows:

- downloadable sheet/MIDI/XML
- watch tutorial button
- no video download button

## 2. Core Components

```text
ProjectCard
MidiUploader
AudioUploader later
SourceLinkInput later
PianoRollPreview
RenderSettingsPanel
JobStatusPanel
SheetPreview
StreamingVideoPlayer
OutputList
UsageLimitBanner
RightsAttestationCheckbox
```

## 3. Video UX Rule

For tutorial videos, show:

```text
Watch Tutorial
```

Do not show:

```text
Download Video
Save MP4
Export MP4
```

Use a streaming player.

Light friction:

```html
<video controls controlsList="nodownload">
```

Disable right-click as UX friction, not security.

## 4. Rights Attestation UI

For audio upload:

```text
I confirm that I own this file or have permission to process it with PianoFlow AI.
```

For social link:

```text
This link is used only as a reference. PianoFlow AI does not download, extract, cache, or store audio/video from this platform.
```

## 5. Job UX

Job states:

```text
Queued
Processing
Completed
Failed
Cancelled
```

Show progress when possible.

For failed jobs:

- show human-safe error
- show retry button
- do not show stack trace

## 6. Empty States

Dashboard empty:

```text
No projects yet. Upload your first MIDI file to create a piano learning pack.
```

No outputs:

```text
No outputs yet. Generate a sheet or tutorial video.
```

## 7. Accessibility

- keyboard navigation
- labels for inputs
- aria-live for job status
- readable contrast
- focus ring
- captions/descriptions where needed
- avoid color-only meaning for hand distinction

## Audio → MIDI UI Update

Add later under Upload page as a disabled/beta tab first:

```text
Upload Audio Beta
```

UI requirements:

- show rights attestation checkbox
- show file limits
- show supported formats
- show warning that output is draft MIDI
- show transcription confidence after job completes
- allow user to continue with draft MIDI into sheet/video pipeline

Copy:

```text
Audio transcription works best with clean solo piano recordings.
The generated MIDI is an editable draft and may need correction.
Only upload audio that you own or have permission to use.
```

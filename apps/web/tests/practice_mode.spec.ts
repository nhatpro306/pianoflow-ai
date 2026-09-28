import { test, expect } from '@playwright/test';

test('Practice Mode - Mock Web MIDI', async ({ page }) => {
  // Expose a mock Web MIDI API to the browser before navigation
  await page.addInitScript(() => {
    class MockMIDIAccess {
      inputs = new Map();
      outputs = new Map();
      onstatechange = null;
    }
    
    class MockMIDIInput {
      id = "mock-piano-1";
      name = "Virtual AI Piano";
      manufacturer = "Antigravity";
      state = "connected";
      connection = "open";
      onmidimessage = null;
    }
    
    const mockInput = new MockMIDIInput();
    const mockAccess = new MockMIDIAccess();
    mockAccess.inputs.set(mockInput.id, mockInput);
    
    (window as any).navigator.requestMIDIAccess = async () => mockAccess;
    (window as any).__MOCK_MIDI_INPUT = mockInput;
  });

  // Navigate to the practice page
  await page.goto('/projects/123/practice');

  // Simulate a MIDI note press (Note On: 0x90, pitch: 60, velocity: 100)
  await page.evaluate(({ p, v }) => {
    const input = (window as any).__MOCK_MIDI_INPUT;
    if (input && input.onmidimessage) {
      input.onmidimessage({ data: new Uint8Array([0x90, p, v]) });
    }
  }, { p: 60, v: 100 });

  // Wait a short duration
  await page.waitForTimeout(500);

  // Simulate a MIDI note release (Note Off: 0x80, pitch: 60, velocity: 0)
  await page.evaluate(({ p }) => {
    const input = (window as any).__MOCK_MIDI_INPUT;
    if (input && input.onmidimessage) {
      input.onmidimessage({ data: new Uint8Array([0x80, p, 0]) });
    }
  }, { p: 60 });

  // Assert that the score appears (based on MCP server's expectation that "Last Score" text is shown)
  await expect(page.locator('div', { hasText: 'Last Score' }).first()).toBeVisible();
});

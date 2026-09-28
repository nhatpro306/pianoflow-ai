import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, Browser, Page } from "playwright";

const server = new McpServer({
  name: "pianoflow-virtual-pianist",
  version: "1.0.0",
});

let browser: Browser | null = null;
let page: Page | null = null;

server.tool("start_session", "Start a headless browser session and navigate to a URL", {
  url: z.string().describe("The URL to open, e.g. http://localhost:3000/projects/123/practice")
}, async ({ url }) => {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  if (page) {
    await page.close();
  }
  page = await browser.newPage();
  
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

  await page.goto(url);
  
  return {
    content: [{ type: "text", text: `Navigated to ${url} with Mock Web MIDI injected.` }]
  };
});

server.tool("play_midi_note", "Send a MIDI note to the browser", {
  pitch: z.number().describe("MIDI pitch (21-108)"),
  velocity: z.number().describe("MIDI velocity (0-127)"),
  duration_ms: z.number().describe("Duration in ms to hold the note")
}, async ({ pitch, velocity, duration_ms }) => {
  if (!page) throw new Error("No active browser session. Call start_session first.");

  // Send Note On
  await page.evaluate(({ p, v }) => {
    const input = (window as any).__MOCK_MIDI_INPUT;
    if (input && input.onmidimessage) {
      input.onmidimessage({ data: new Uint8Array([0x90, p, v]) });
    }
  }, { p: pitch, v: velocity });

  // Wait duration
  await new Promise(r => setTimeout(r, duration_ms));

  // Send Note Off
  await page.evaluate(({ p }) => {
    const input = (window as any).__MOCK_MIDI_INPUT;
    if (input && input.onmidimessage) {
      input.onmidimessage({ data: new Uint8Array([0x80, p, 0]) });
    }
  }, { p: pitch });

  return {
    content: [{ type: "text", text: `Played pitch ${pitch} for ${duration_ms}ms.` }]
  };
});

server.tool("get_practice_score", "Get the current score from the UI", {}, async () => {
  if (!page) throw new Error("No active browser session.");
  
  const scoreText = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div'));
    for (const card of cards) {
      if (card.textContent && card.textContent.includes("Last Score")) {
        return card.textContent.trim().replace(/\s+/g, ' ');
      }
    }
    return "Not found";
  });
  
  return {
    content: [{ type: "text", text: `Score info: ${scoreText}` }]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

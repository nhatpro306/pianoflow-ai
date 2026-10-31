import { test, expect } from "@playwright/test";
import { getKeyRootPitch } from "../lib/songs/motifGenerator";

test.describe("Harmonic Key Parsing (Major vs Minor)", () => {
  const testCases: Array<{
    keyStr: string;
    expectedRoot: number;
    expectedIsMinor: boolean;
  }> = [
    // Major keys: isMinor must be strictly FALSE
    { keyStr: "C maj", expectedRoot: 60, expectedIsMinor: false },
    { keyStr: "C major", expectedRoot: 60, expectedIsMinor: false },
    { keyStr: "D Major", expectedRoot: 62, expectedIsMinor: false },
    { keyStr: "Eb maj", expectedRoot: 63, expectedIsMinor: false },
    { keyStr: "F# major", expectedRoot: 66, expectedIsMinor: false },
    { keyStr: "G", expectedRoot: 67, expectedIsMinor: false },

    // Minor keys: isMinor must be strictly TRUE
    { keyStr: "A min", expectedRoot: 69, expectedIsMinor: true },
    { keyStr: "A minor", expectedRoot: 69, expectedIsMinor: true },
    { keyStr: "Am", expectedRoot: 69, expectedIsMinor: true },
    { keyStr: "C# min", expectedRoot: 61, expectedIsMinor: true },
    { keyStr: "E min", expectedRoot: 64, expectedIsMinor: true },
  ];

  for (const tc of testCases) {
    test(`correctly parses "${tc.keyStr}" -> root ${tc.expectedRoot}, isMinor=${tc.expectedIsMinor}`, () => {
      const result = getKeyRootPitch(tc.keyStr);
      expect(result.rootPitch).toBe(tc.expectedRoot);
      expect(result.isMinor).toBe(tc.expectedIsMinor);
    });
  }
});

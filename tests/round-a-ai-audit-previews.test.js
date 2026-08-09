import assert from "node:assert/strict";
import test from "node:test";
import { sampleTimes } from "../scripts/generate-round-a-ai-audit-previews.js";

test("audit preview sampling covers the interior of the complete segment", () => {
  const times = sampleTimes(10, 20, 5);

  assert.deepEqual(times, [10.2, 12.6, 15, 17.4, 19.8]);
  assert.ok(times[0] > 10);
  assert.ok(times.at(-1) < 20);
});

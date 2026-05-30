function roundKey(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "na";
  }

  return value.toFixed(2);
}

function cycleKey(cycle) {
  if (!cycle) {
    return null;
  }

  return `${roundKey(cycle.startSecond)}-${roundKey(cycle.endSecond)}`;
}

function getSegmentKey(segment) {
  return segment.segmentId ?? `rep_${segment.repetitionIndex}`;
}

function getCycleAnchorSecond(cycle) {
  if (!cycle) {
    return null;
  }

  const anchor =
    cycle.lowestPointSecond ??
    cycle.peakSecond ??
    cycle.bestReachSecond ??
    null;

  if (typeof anchor === "number" && Number.isFinite(anchor)) {
    return anchor;
  }

  if (
    typeof cycle.startSecond === "number" &&
    Number.isFinite(cycle.startSecond) &&
    typeof cycle.endSecond === "number" &&
    Number.isFinite(cycle.endSecond)
  ) {
    return (cycle.startSecond + cycle.endSecond) / 2;
  }

  return null;
}

function getOverlapRatio(segment, cycle) {
  if (!segment || !cycle) {
    return 0;
  }

  const overlapStart = Math.max(segment.startSecond, cycle.startSecond);
  const overlapEnd = Math.min(segment.endSecond, cycle.endSecond);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const cycleDuration = Math.max(0.01, cycle.endSecond - cycle.startSecond);

  return overlap / cycleDuration;
}

function getCycleOverlapRatio(left, right) {
  if (!left || !right) {
    return 0;
  }

  const overlapStart = Math.max(left.startSecond, right.startSecond);
  const overlapEnd = Math.min(left.endSecond, right.endSecond);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  const shorterDuration = Math.max(
    0.01,
    Math.min(
      left.endSecond - left.startSecond,
      right.endSecond - right.startSecond,
    ),
  );

  return overlap / shorterDuration;
}

function getCycleStrength(cycle) {
  const movementSignal =
    cycle.peakClearance ??
    cycle.peakDepthRatio ??
    cycle.peakElevation ??
    cycle.amplitude ??
    0;
  const visibility = cycle.avgVisibility ?? 0;

  return movementSignal + visibility * 0.05;
}

function pickStrongerCycle(left, right) {
  return getCycleStrength(right) > getCycleStrength(left) ? right : left;
}

export function dedupeOverlappingCycles(cycles, options = {}) {
  const { overlapThreshold = 0.85 } = options;
  const sortedCycles = [...(cycles ?? [])].sort((left, right) => {
    if (left.startSecond !== right.startSecond) {
      return left.startSecond - right.startSecond;
    }

    return getCycleAnchorSecond(left) - getCycleAnchorSecond(right);
  });
  const deduped = [];

  for (const cycle of sortedCycles) {
    const overlappingIndex = deduped.findIndex(
      (candidate) => getCycleOverlapRatio(candidate, cycle) >= overlapThreshold,
    );

    if (overlappingIndex === -1) {
      deduped.push(cycle);
      continue;
    }

    deduped[overlappingIndex] = pickStrongerCycle(
      deduped[overlappingIndex],
      cycle,
    );
  }

  return deduped
    .sort((left, right) => {
      const leftAnchor = getCycleAnchorSecond(left) ?? left.startSecond;
      const rightAnchor = getCycleAnchorSecond(right) ?? right.startSecond;

      return leftAnchor - rightAnchor;
    })
    .map((cycle, index) => ({
      ...cycle,
      repetitionIndex: index + 1,
    }));
}

function getAssignmentCost(segment, cycle) {
  const anchor = getCycleAnchorSecond(cycle);

  if (anchor === null) {
    return Number.POSITIVE_INFINITY;
  }

  const segmentDuration = Math.max(
    0.01,
    segment.endSecond - segment.startSecond,
  );
  const midpoint = (segment.startSecond + segment.endSecond) / 2;
  const anchorDistance = Math.abs(anchor - midpoint);
  const outsideDistance =
    anchor < segment.startSecond
      ? segment.startSecond - anchor
      : anchor > segment.endSecond
        ? anchor - segment.endSecond
        : 0;
  const overlapPenalty =
    (1 - getOverlapRatio(segment, cycle)) * segmentDuration;

  return anchorDistance + outsideDistance * 3 + overlapPenalty;
}

function betterAssignment(left, right) {
  if (!right) {
    return left;
  }

  if (!left) {
    return right;
  }

  if (left.matches !== right.matches) {
    return left.matches > right.matches ? left : right;
  }

  return left.cost <= right.cost ? left : right;
}

export function assignUniqueCyclesToSegments(segments, cycles) {
  const sortedSegments = [...(segments ?? [])].sort((left, right) => {
    const leftIndex = left.repetitionIndex ?? 0;
    const rightIndex = right.repetitionIndex ?? 0;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.startSecond - right.startSecond;
  });
  const sortedCycles = [...(cycles ?? [])]
    .map((cycle, index) => ({
      cycle,
      index,
      anchorSecond: getCycleAnchorSecond(cycle),
    }))
    .filter((item) => item.anchorSecond !== null)
    .sort((left, right) => {
      if (left.anchorSecond !== right.anchorSecond) {
        return left.anchorSecond - right.anchorSecond;
      }

      return left.index - right.index;
    });
  const memo = new Map();

  function search(segmentIndex, cycleIndex) {
    if (
      segmentIndex >= sortedSegments.length ||
      cycleIndex >= sortedCycles.length
    ) {
      return {
        matches: 0,
        cost: 0,
        pairs: [],
      };
    }

    const memoKey = `${segmentIndex}:${cycleIndex}`;

    if (memo.has(memoKey)) {
      return memo.get(memoKey);
    }

    const segment = sortedSegments[segmentIndex];
    const cycle = sortedCycles[cycleIndex].cycle;
    const assignRest = search(segmentIndex + 1, cycleIndex + 1);
    const assign = {
      matches: assignRest.matches + 1,
      cost: assignRest.cost + getAssignmentCost(segment, cycle),
      pairs: [[segment, cycle], ...assignRest.pairs],
    };
    const skipSegment = search(segmentIndex + 1, cycleIndex);
    const skipCycle = search(segmentIndex, cycleIndex + 1);
    const best = betterAssignment(
      assign,
      betterAssignment(skipSegment, skipCycle),
    );

    memo.set(memoKey, best);
    return best;
  }

  const assignments = new Map();

  for (const [segment, cycle] of search(0, 0).pairs) {
    assignments.set(getSegmentKey(segment), cycle);
  }

  return assignments;
}

export function buildNoUniqueCycleAssignmentItem(cycles) {
  return {
    status: "needs_adjustment",
    label: "Needs timing adjustment",
    issues: [
      {
        code: "no_unique_cycle_assignment",
        severity: "error",
        message:
          "No unique movement cycle could be assigned to this segment; review detected reps and segment timing.",
      },
    ],
    cycle: null,
    metrics: {
      detectedCycles: cycles.length,
    },
  };
}

function buildCycleCountIssue(code, severity, message) {
  return { code, severity, message };
}

export function summarizeCycleCountQa({
  segments = [],
  candidateCycles = [],
  assignedCycles = [],
} = {}) {
  const expectedSegments = segments.length;
  const candidateCyclesTotal = candidateCycles.length;
  const assignedCyclesTotal = assignedCycles.length;
  const issues = [];

  if (expectedSegments > 0 && candidateCyclesTotal < expectedSegments) {
    issues.push(
      buildCycleCountIssue(
        "detected_cycle_shortfall",
        "error",
        "The detector found fewer movement cycles than expected segments; review Expected Reps, active range, or timing.",
      ),
    );
  }

  if (expectedSegments > 0 && assignedCyclesTotal < expectedSegments) {
    issues.push(
      buildCycleCountIssue(
        "assigned_cycle_shortfall",
        "error",
        "Fewer unique movement cycles were assigned than expected segments; some clips need manual review.",
      ),
    );
  }

  if (expectedSegments > 0 && candidateCyclesTotal > expectedSegments) {
    issues.push(
      buildCycleCountIssue(
        "extra_candidate_cycles",
        "warning",
        "The detector found more candidate movement cycles than expected segments; confirm the selected clips are the intended reps.",
      ),
    );
  }

  const hasBlockingIssue = issues.some((issue) => issue.severity === "error");

  return {
    status: hasBlockingIssue
      ? "blocked"
      : issues.length > 0
        ? "needs_review"
        : "ok",
    expectedSegments,
    candidateCyclesTotal,
    assignedCyclesTotal,
    issues,
  };
}

export function flagDuplicateCycleAssignments(items) {
  const keyCounts = new Map();

  for (const item of items) {
    const key = cycleKey(item.cycle);

    if (key) {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }

  return items.map((item) => {
    const key = cycleKey(item.cycle);

    if (!key || (keyCounts.get(key) ?? 0) <= 1) {
      return item;
    }

    const duplicateIssue = {
      code: "duplicate_cycle_assignment",
      severity: "error",
      message:
        "Multiple segments map to the same detected movement cycle; review rep count or timing before scoring.",
    };
    const issues = item.issues?.some(
      (issue) => issue.code === duplicateIssue.code,
    )
      ? item.issues
      : [...(item.issues ?? []), duplicateIssue];

    return {
      ...item,
      status: "needs_adjustment",
      label: "Needs timing adjustment",
      issues,
      metrics: item.metrics
        ? {
            ...item.metrics,
            duplicateCycleKey: key,
          }
        : item.metrics,
    };
  });
}

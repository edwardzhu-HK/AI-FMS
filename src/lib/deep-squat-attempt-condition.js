export const DEEP_SQUAT_ATTEMPT_FLOOR = "floor";
export const DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED = "heels_elevated_board";
export const DEEP_SQUAT_ATTEMPT_UNKNOWN = "unknown";

export const DEEP_SQUAT_ATTEMPT_CONDITIONS = [
  DEEP_SQUAT_ATTEMPT_FLOOR,
  DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED,
  DEEP_SQUAT_ATTEMPT_UNKNOWN,
];

const HEEL_ELEVATED_EN =
  "heel[- ]?elevated|heels elevated|heel lift|heel lifted|heels lifted|heel raised|heels raised|heel off floor|heels off floor|board under heels|fms board";
const HEEL_ELEVATED_ZH =
  "脚后跟垫高|脚跟垫高|垫脚跟|垫高脚跟|脚后跟抬起|脚跟抬起|脚后跟离地|脚跟离地|FMS板|fms板";

const CHINESE_DIGITS = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function parseChineseNumber(token) {
  if (!token) {
    return null;
  }

  if (token === "十") {
    return 10;
  }

  if (token.includes("十")) {
    const [leftRaw, rightRaw] = token.split("十");
    const left = leftRaw ? CHINESE_DIGITS[leftRaw] : 1;
    const right = rightRaw ? CHINESE_DIGITS[rightRaw] : 0;

    if (left === undefined || right === undefined) {
      return null;
    }

    return left * 10 + right;
  }

  return CHINESE_DIGITS[token] ?? null;
}

function parseNaturalNumber(token) {
  if (!token) {
    return null;
  }

  if (/^\d+$/.test(token)) {
    return Number(token);
  }

  return parseChineseNumber(token);
}

function hasHeelElevatedKeyword(text) {
  const notes = text ?? "";

  return (
    new RegExp(HEEL_ELEVATED_EN, "i").test(notes) ||
    new RegExp(HEEL_ELEVATED_ZH, "i").test(notes)
  );
}

function addRange(repetitions, startToken, endToken) {
  const start = parseNaturalNumber(startToken);
  const end = parseNaturalNumber(endToken);

  if (!start || !end) {
    return;
  }

  for (
    let index = Math.min(start, end);
    index <= Math.max(start, end);
    index += 1
  ) {
    repetitions.add(index);
  }
}

function addSingle(repetitions, token) {
  const index = parseNaturalNumber(token);

  if (index) {
    repetitions.add(index);
  }
}

export function normalizeDeepSquatAttemptCondition(value) {
  return DEEP_SQUAT_ATTEMPT_CONDITIONS.includes(value)
    ? value
    : DEEP_SQUAT_ATTEMPT_FLOOR;
}

export function isHeelElevatedAttempt(attemptCondition) {
  return (
    normalizeDeepSquatAttemptCondition(attemptCondition) ===
    DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED
  );
}

export function capDeepSquatAttemptScoreForCondition(score, attemptCondition) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return null;
  }

  if (isHeelElevatedAttempt(attemptCondition)) {
    return Math.min(score, 2);
  }

  return score;
}

export function parseHeelElevatedRepetitions(notesText, repetitionCount = 0) {
  const notes = notesText ?? "";
  const repetitions = new Set();
  const indexToken = "([一二三四五六七八九十两\\d]+)";

  const rangePatterns = [
    new RegExp(
      `rep\\s*${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}[^.;；，。\\n]*?(?:${HEEL_ELEVATED_EN})`,
      "gi",
    ),
    new RegExp(
      `(?:第\\s*${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep)?|${indexToken}\\s*(?:个|次|段|rep)\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep)?|${indexToken}\\s*(?:-|–|—|~|到|至)\\s*${indexToken}\\s*(?:个|次|段|rep))[^；，。\\n]*?(?:${HEEL_ELEVATED_ZH})`,
      "gi",
    ),
  ];

  rangePatterns.forEach((pattern) => {
    let match = pattern.exec(notes);
    while (match) {
      const [startToken, endToken] = match.slice(1).filter(Boolean);
      addRange(repetitions, startToken, endToken);
      match = pattern.exec(notes);
    }
  });

  const singlePatterns = [
    new RegExp(
      `rep\\s*${indexToken}[^.;；，。\\n]*?(?:${HEEL_ELEVATED_EN})`,
      "gi",
    ),
    new RegExp(
      `第\\s*${indexToken}\\s*(?:个|次|段|rep)?[^；，。\\n]*?(?:${HEEL_ELEVATED_ZH})`,
      "gi",
    ),
  ];

  singlePatterns.forEach((pattern) => {
    let match = pattern.exec(notes);
    while (match) {
      addSingle(repetitions, match[1]);
      match = pattern.exec(notes);
    }
  });

  if (
    repetitionCount > 0 &&
    (notes.includes("后两个") || notes.toLowerCase().includes("last two")) &&
    hasHeelElevatedKeyword(notes)
  ) {
    addRange(repetitions, repetitionCount - 1, repetitionCount);
  }

  if (
    repetitionCount > 1 &&
    hasHeelElevatedKeyword(notes) &&
    (/(?:except|besides|other than|apart from)\s+(?:the\s+)?first|all\s+but\s+(?:the\s+)?first/i.test(
      notes,
    ) ||
      /除了?\s*第?\s*[一1]\s*(?:个|次|段|rep)?(?:以外|之外)?[^；，。.\n]*(?:都|其余|其他|后面)/.test(
        notes,
      ) ||
      /(?:其余|其他|后面)[^；，。.\n]*(?:都)?[^；，。.\n]*(?:脚后跟垫高|脚跟垫高|垫脚跟|垫高脚跟|脚后跟抬起|脚跟抬起|脚后跟离地|脚跟离地)/.test(
        notes,
      ))
  ) {
    addRange(repetitions, 2, repetitionCount);
  }

  return repetitions;
}

export function inferHeelElevatedRepetitions({
  notes = "",
  repetitionCount = 0,
} = {}) {
  return parseHeelElevatedRepetitions(notes, repetitionCount);
}

export function inferDeepSquatAttemptCondition({
  segment = null,
  notes = "",
  repetitionCount = 0,
} = {}) {
  const repetitionIndex = segment?.repetitionIndex;
  const heelElevatedRepetitions = inferHeelElevatedRepetitions({
    notes,
    repetitionCount,
  });

  if (heelElevatedRepetitions.has(repetitionIndex)) {
    return DEEP_SQUAT_ATTEMPT_HEELS_ELEVATED;
  }

  return normalizeDeepSquatAttemptCondition(segment?.attemptCondition);
}

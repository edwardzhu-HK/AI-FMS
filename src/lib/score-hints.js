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

function normalize(text) {
  return (text ?? "").toLowerCase();
}

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

function parseScoreToken(token) {
  const score = parseNaturalNumber(token);
  return [1, 2, 3].includes(score) ? score : null;
}

function addScore(scoresByRep, repetitionIndex, score, repetitionCount) {
  if (
    Number.isInteger(repetitionIndex) &&
    repetitionIndex >= 1 &&
    repetitionIndex <= repetitionCount &&
    [1, 2, 3].includes(score)
  ) {
    scoresByRep.set(repetitionIndex, score);
  }
}

function addRangeScore(
  scoresByRep,
  startIndex,
  endIndex,
  score,
  repetitionCount,
) {
  if (![1, 2, 3].includes(score)) {
    return;
  }

  for (
    let index = Math.max(1, startIndex);
    index <= Math.min(repetitionCount, endIndex);
    index += 1
  ) {
    scoresByRep.set(index, score);
  }
}

function applyExactScores(text, scoresByRep, repetitionCount) {
  const chineseExact =
    /第\s*([一二三四五六七八九十两\d]+)\s*(?:个|次|段|rep)?[^，。；,.]*(?:score\s*)?(?:是|为)?\s*([123一二三两])\s*分?/gi;
  let match = chineseExact.exec(text);
  while (match) {
    addScore(
      scoresByRep,
      parseNaturalNumber(match[1]),
      parseScoreToken(match[2]),
      repetitionCount,
    );
    match = chineseExact.exec(text);
  }

  const englishExact = /rep\s*(\d+)[^,.；，]*(?:score|is)\s*([123])/gi;
  match = englishExact.exec(text);
  while (match) {
    addScore(
      scoresByRep,
      parseNaturalNumber(match[1]),
      parseScoreToken(match[2]),
      repetitionCount,
    );
    match = englishExact.exec(text);
  }
}

function applyUniformScores(text, scoresByRep, repetitionCount) {
  const englishUniform =
    /(\d+)\s*(?:reps?|actions?|segments?)\b[^,.；，]*[,.；，]?\s*score\s*([123])/gi;
  let match = englishUniform.exec(text);
  while (match) {
    const previousWord = text
      .slice(0, match.index)
      .trimEnd()
      .split(/\s+/)
      .at(-1);

    if (!["first", "then", "last", "and"].includes(previousWord)) {
      const count = parseNaturalNumber(match[1]);
      const score = parseScoreToken(match[2]);

      if (count === repetitionCount && score) {
        addRangeScore(scoresByRep, 1, repetitionCount, score, repetitionCount);
      }
    }

    match = englishUniform.exec(text);
  }
}

function applyFirstLastScores(text, scoresByRep, repetitionCount) {
  const chineseFirst =
    /前\s*([一二三四五六七八九十两\d]+)\s*(?:个|次|段|reps?)?[^，。；,.]*(?:score\s*)?(?:是|为)?\s*([123一二三两])\s*分?/gi;
  let match = chineseFirst.exec(text);
  while (match) {
    const count = parseNaturalNumber(match[1]);
    const score = parseScoreToken(match[2]);
    if (count && score) {
      addRangeScore(scoresByRep, 1, count, score, repetitionCount);
    }
    match = chineseFirst.exec(text);
  }

  const englishFirst =
    /\bfirst\s+(\d+)\s*(?:reps?|actions?|segments?)?[^,.；，]*?\bscore\s*([123])/gi;
  match = englishFirst.exec(text);
  while (match) {
    const count = parseNaturalNumber(match[1]);
    const score = parseScoreToken(match[2]);
    if (count && score) {
      addRangeScore(scoresByRep, 1, count, score, repetitionCount);
    }
    match = englishFirst.exec(text);
  }

  const chineseLast =
    /(?:后|最后)\s*([一二三四五六七八九十两\d]+)\s*(?:个|次|段|reps?)?[^，。；,.]*(?:score\s*)?(?:是|为)?\s*([123一二三两])\s*分?/gi;
  match = chineseLast.exec(text);
  while (match) {
    const count = parseNaturalNumber(match[1]);
    const score = parseScoreToken(match[2]);
    if (count && score) {
      addRangeScore(
        scoresByRep,
        repetitionCount - count + 1,
        repetitionCount,
        score,
        repetitionCount,
      );
    }
    match = chineseLast.exec(text);
  }

  const englishLast =
    /\blast\s+(\d+)\s*(?:reps?|actions?|segments?)?[^,.；，]*?\bscore\s*([123])/gi;
  match = englishLast.exec(text);
  while (match) {
    const count = parseNaturalNumber(match[1]);
    const score = parseScoreToken(match[2]);
    if (count && score) {
      addRangeScore(
        scoresByRep,
        repetitionCount - count + 1,
        repetitionCount,
        score,
        repetitionCount,
      );
    }
    match = englishLast.exec(text);
  }
}

function applyEnglishSequentialScores(text, scoresByRep, repetitionCount) {
  const firstPattern =
    /\bfirst\s+(\d+)\s*(?:reps?|actions?|segments?)?[^,.；，]*?\bscore\s*([123])/i;
  const firstMatch = firstPattern.exec(text);

  if (!firstMatch) {
    return;
  }

  let cursor = parseNaturalNumber(firstMatch[1]) + 1;
  const tail = text.slice(firstMatch.index + firstMatch[0].length);
  const nextPattern =
    /\b(?:then|and|,)\s*(\d+)\s*(?:reps?|actions?|segments?)?[^,.；，]*?\bscore\s*([123])/gi;
  let match = nextPattern.exec(tail);

  while (match) {
    const count = parseNaturalNumber(match[1]);
    const score = parseScoreToken(match[2]);

    if (count && score) {
      addRangeScore(
        scoresByRep,
        cursor,
        cursor + count - 1,
        score,
        repetitionCount,
      );
      cursor += count;
    }

    match = nextPattern.exec(tail);
  }
}

export function inferScoreForRepetitionFromText({
  text,
  repetitionIndex,
  repetitionCount,
} = {}) {
  if (!text || !repetitionIndex || !repetitionCount) {
    return null;
  }

  const normalized = normalize(text);
  const scoresByRep = new Map();

  applyUniformScores(normalized, scoresByRep, repetitionCount);
  applyFirstLastScores(normalized, scoresByRep, repetitionCount);
  applyEnglishSequentialScores(normalized, scoresByRep, repetitionCount);
  applyExactScores(normalized, scoresByRep, repetitionCount);

  return scoresByRep.get(repetitionIndex) ?? null;
}

export function inferScoreForRepetition({
  notes = "",
  fileName = "",
  repetitionIndex,
  repetitionCount,
} = {}) {
  return (
    inferScoreForRepetitionFromText({
      text: notes,
      repetitionIndex,
      repetitionCount,
    }) ??
    inferScoreForRepetitionFromText({
      text: fileName,
      repetitionIndex,
      repetitionCount,
    })
  );
}

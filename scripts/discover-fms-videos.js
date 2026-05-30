import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_DEFINITIONS,
  buildCandidateMarkdown,
  buildCandidateRegistry,
  getActionTypes,
  loadExistingVideoIndex,
  mergeCandidateRegistries,
} from "./online-video-candidates.js";

const DEFAULT_JSON_OUTPUT =
  "Eval_Videos/online-candidates/fms-video-candidates.json";
const DEFAULT_MARKDOWN_OUTPUT = "docs/online_fms_video_candidates.md";

function parseArgs(argv) {
  const args = {
    action: "all",
    maxResults: 10,
    jsonOutput: DEFAULT_JSON_OUTPUT,
    markdownOutput: DEFAULT_MARKDOWN_OUTPUT,
    fixture: "",
    apiKey: process.env.YOUTUBE_API_KEY ?? "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--action" && argv[i + 1]) {
      args.action = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--max-results" && argv[i + 1]) {
      args.maxResults = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (token === "--json-output" && argv[i + 1]) {
      args.jsonOutput = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--markdown-output" && argv[i + 1]) {
      args.markdownOutput = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--fixture" && argv[i + 1]) {
      args.fixture = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--api-key" && argv[i + 1]) {
      args.apiKey = argv[i + 1];
      i += 1;
    }
  }

  if (!Number.isInteger(args.maxResults) || args.maxResults <= 0) {
    throw new Error("--max-results must be a positive integer");
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8"),
  );
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), filePath)), {
    recursive: true,
  });
  fs.writeFileSync(filePath, text);
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `request failed ${response.status}: ${await response.text()}`,
    );
  }

  return response.json();
}

async function searchYouTube({ actionTypes, maxResults, apiKey }) {
  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY is required unless --fixture is provided. Discovery uses the official YouTube Data API and does not scrape pages.",
    );
  }

  const searchItemsByAction = {};
  const videoIds = new Set();

  for (const actionType of actionTypes) {
    searchItemsByAction[actionType] = [];

    for (const query of ACTION_DEFINITIONS[actionType].queries) {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        maxResults: String(maxResults),
        q: query,
        safeSearch: "moderate",
        videoEmbeddable: "true",
        key: apiKey,
      });
      const result = await fetchJson(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      );

      for (const item of result.items ?? []) {
        if (item.id?.videoId) {
          searchItemsByAction[actionType].push(item);
          videoIds.add(item.id.videoId);
        }
      }
    }
  }

  const videoDetailsById = {};
  const idList = [...videoIds];
  for (let i = 0; i < idList.length; i += 50) {
    const ids = idList.slice(i, i + 50);
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics,status",
      id: ids.join(","),
      key: apiKey,
    });
    const result = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
    );

    for (const item of result.items ?? []) {
      videoDetailsById[item.id] = item;
    }
  }

  return {
    searchItemsByAction,
    videoDetailsById,
  };
}

async function discoverFmsVideos(args) {
  const actionTypes = getActionTypes(args.action);
  const existingIndex = loadExistingVideoIndex();
  const sourceData = args.fixture
    ? readJson(args.fixture)
    : await searchYouTube({
        actionTypes,
        maxResults: args.maxResults,
        apiKey: args.apiKey,
      });

  const discoveredRegistry = buildCandidateRegistry({
    actionTypes,
    searchItemsByAction: sourceData.searchItemsByAction ?? {},
    videoDetailsById: sourceData.videoDetailsById ?? {},
    existingIndex,
  });
  const existingRegistry = fs.existsSync(path.resolve(args.jsonOutput))
    ? readJson(args.jsonOutput)
    : null;
  const registry = mergeCandidateRegistries(
    existingRegistry,
    discoveredRegistry,
  );

  writeText(args.jsonOutput, `${JSON.stringify(registry, null, 2)}\n`);
  writeText(args.markdownOutput, buildCandidateMarkdown(registry));

  return registry;
}

export { discoverFmsVideos, parseArgs, searchYouTube };

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (entryPath === currentPath) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const registry = await discoverFmsVideos(args);
    console.log(`Candidate registry written: ${args.jsonOutput}`);
    console.log(`Candidate report written: ${args.markdownOutput}`);
    console.log(`Candidates: ${registry.candidates.length}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

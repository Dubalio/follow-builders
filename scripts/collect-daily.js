#!/usr/bin/env node

// ============================================================================
// Follow Builders — Collect Daily
// ============================================================================
// Runs once a day. Fetches the central X/Twitter feed (which only exposes
// the last 24h) and appends any new tweets into a local weekly buffer file,
// so nothing is lost between the daily fetches. No LLM call here — this is
// pure data collection, free to run every day.
//
// Usage: node collect-daily.js
// Reads/writes: weekly-buffer.json (repo root)
// ============================================================================

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const BUFFER_PATH = join(process.cwd(), '..', 'weekly-buffer.json');

async function main() {
  const res = await fetch(FEED_X_URL);
  if (!res.ok) throw new Error(`Could not fetch tweet feed: ${res.status}`);
  const feed = await res.json();

  let buffer = { builders: {} };
  if (existsSync(BUFFER_PATH)) {
    buffer = JSON.parse(await readFile(BUFFER_PATH, 'utf-8'));
  }

  let added = 0;
  for (const account of feed.x || []) {
    if (!buffer.builders[account.handle]) {
      buffer.builders[account.handle] = {
        name: account.name,
        handle: account.handle,
        bio: account.bio,
        tweets: {}
      };
    }
    const entry = buffer.builders[account.handle];
    for (const tweet of account.tweets) {
      if (!entry.tweets[tweet.id]) {
        entry.tweets[tweet.id] = {
          text: tweet.text,
          url: tweet.url,
          createdAt: tweet.createdAt,
          likes: tweet.likes,
          retweets: tweet.retweets
        };
        added++;
      }
    }
  }

  await writeFile(BUFFER_PATH, JSON.stringify(buffer, null, 2));
  console.log(JSON.stringify({ status: 'ok', tweetsAdded: added }));
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});

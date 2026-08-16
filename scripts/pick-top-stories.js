#!/usr/bin/env node

// ============================================================================
// Follow Builders — Pick Top Stories
// ============================================================================
// Reads the week's accumulated tweet buffer, hands it to GPT along with
// the built-in web_search tool, and asks it to pick the 3 most important AI
// stories of the week — cross-checking the tweets against real web search
// results, not just picking whatever got the most likes.
//
// Usage: node pick-top-stories.js
// Reads: weekly-buffer.json (repo root)
// Output: plain text digest to stdout
// ============================================================================

import { readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

const BUFFER_PATH = join(process.cwd(), '..', 'weekly-buffer.json');

function buildTweetList(buffer) {
  const lines = [];
  for (const handle of Object.keys(buffer.builders)) {
    const builder = buffer.builders[handle];
    const tweetIds = Object.keys(builder.tweets);
    if (tweetIds.length === 0) continue;
    lines.push(`### ${builder.name} (@${builder.handle}) — ${builder.bio || ''}`);
    for (const id of tweetIds) {
      const t = builder.tweets[id];
      lines.push(`- ${t.text.replace(/\s+/g, ' ').trim()}\n  URL: ${t.url}`);
    }
  }
  return lines.join('\n');
}

async function main() {
  const buffer = JSON.parse(await readFile(BUFFER_PATH, 'utf-8'));
  const tweetList = buildTweetList(buffer);

  if (!tweetList.trim()) {
    console.log('No new updates from your builders this week.');
    return;
  }

  const client = new OpenAI();

  const response = await client.responses.create({
    model: 'gpt-5.6',
    max_output_tokens: 4096,
    tools: [{ type: 'web_search' }],
    input: `Below are tweets from the past week from AI builders I follow on X/Twitter.

${tweetList}

From these, identify candidates that look like they could be significant AI industry news (product launches, major technical results, notable industry moves) — not personal musings, jokes, or banter. For each candidate, use web search to verify whether it was actually a significant story this week, not just something that got engagement.

Pick the 3 most important stories of the week. For each one, write:
1. A one-line headline
2. A 2-3 sentence explanation of why it matters
3. The original tweet URL (only use URLs that appear in the tweet list above — never invent one)

Format as plain text ready to send as a Telegram message (use *bold* for headlines, not markdown headers). No preamble, no closing remarks — just the 3 stories.`
  });

  console.log((response.output_text || '').trim() || 'Could not determine top stories this week.');
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});

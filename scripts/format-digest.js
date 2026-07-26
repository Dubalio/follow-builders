#!/usr/bin/env node

// ============================================================================
// Follow Builders — Format Digest (no LLM)
// ============================================================================
// Reads the JSON blob produced by prepare-digest.js and turns it into a
// plain-text digest: title + author/bio + link for each item. No AI summary —
// this is the free path for running the digest unattended (e.g. GitHub
// Actions) without an LLM API key.
//
// Usage: node prepare-digest.js | node format-digest.js | node deliver.js
// ============================================================================

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

function truncate(text, max) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max).trim() + '…' : clean;
}

function formatX(x) {
  const lines = ['*X / Twitter*', ''];
  for (const builder of x) {
    const role = builder.bio ? ` — ${truncate(builder.bio, 60)}` : '';
    lines.push(`_${builder.name}${role}_`);
    for (const tweet of builder.tweets) {
      lines.push(`• ${truncate(tweet.text, 220)}`);
      lines.push(`  ${tweet.url}`);
    }
    lines.push('');
  }
  return lines;
}

function formatPodcasts(podcasts) {
  const lines = ['*Podcasts*', ''];
  for (const ep of podcasts) {
    lines.push(`• ${ep.name}: ${ep.title}`);
    lines.push(`  ${ep.url}`);
  }
  lines.push('');
  return lines;
}

function formatBlogs(blogs) {
  const lines = ['*Blogs*', ''];
  for (const post of blogs) {
    lines.push(`• ${post.title}`);
    lines.push(`  ${post.url}`);
  }
  lines.push('');
  return lines;
}

async function main() {
  const raw = await readStdin();
  const data = JSON.parse(raw);

  const { xBuilders = 0, podcastEpisodes = 0, blogPosts = 0 } = data.stats || {};
  if (xBuilders === 0 && podcastEpisodes === 0 && blogPosts === 0) {
    console.log('No new updates from your builders this week.');
    return;
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const lines = [`*AI Builders Digest* — ${dateLabel}`, ''];

  if (data.x?.length) lines.push(...formatX(data.x));
  if (data.podcasts?.length) lines.push(...formatPodcasts(data.podcasts));
  if (data.blogs?.length) lines.push(...formatBlogs(data.blogs));

  console.log(lines.join('\n').trim());
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});

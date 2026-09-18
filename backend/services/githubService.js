const axios = require("axios");
const Post = require("../models/Post");
const aiService = require("./aiService");

// Pulls public push events since `sinceDate` for a GitHub username, and
// returns a plain-text summary of commit messages grouped by repo — cheap
// context to feed into the caption model, not a full commit diff.
async function fetchCommitSummary(username, token, sinceDate) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await axios.get(
    `https://api.github.com/users/${encodeURIComponent(username)}/events/public`,
    { headers, params: { per_page: 100 } }
  );

  const pushEvents = res.data.filter(
    (e) => e.type === "PushEvent" && new Date(e.created_at) > sinceDate
  );

  console.log(
    `GitHub recap for ${username}: ${res.data.length} recent public events, ${pushEvents.length} push events since ${sinceDate.toISOString()}`
  );
  console.log(
    "Push event commit counts:",
    pushEvents.map((e) => (e.payload?.commits || []).length)
  );

  if (pushEvents.length === 0) return null;

  const byRepo = {};
  for (const event of pushEvents) {
    const repo = event.repo?.name || "unknown repo";
    byRepo[repo] = byRepo[repo] || { messages: [], pushCount: 0 };
    byRepo[repo].pushCount += 1;
    for (const commit of event.payload?.commits || []) {
      if (commit?.message) byRepo[repo].messages.push(commit.message.split("\n")[0]);
    }
  }

  // Prefer non-merge commit messages (they're more informative), but if a
  // repo's activity was ALL merges, keep them rather than silently
  // dropping that repo's activity entirely — a merge-heavy workflow (PRs
  // merged via GitHub's UI) shouldn't look identical to "no activity".
  for (const repo of Object.keys(byRepo)) {
    const nonMerge = byRepo[repo].messages.filter((msg) => !/^merge/i.test(msg));
    byRepo[repo].messages = nonMerge.length > 0 ? nonMerge : byRepo[repo].messages;
  }

  const lines = Object.entries(byRepo).map(([repo, { messages, pushCount }]) => {
    if (messages.length > 0) {
      return `${repo}:\n- ${messages.slice(0, 8).join("\n- ")}`;
    }
    // GitHub's public events API doesn't always include full commit
    // message details even for genuine recent pushes — when that happens,
    // fall back to a plain activity count instead of reporting nothing.
    return `${repo}:\n- ${pushCount} push${pushCount === 1 ? "" : "es"} (commit details not available from GitHub's activity feed)`;
  });

  return lines.length > 0 ? lines.join("\n\n") : null;
}

// Generates (and saves as a draft) a weekly recap post for one user, based
// on their GitHub activity since their last recap. Returns the created
// Post, or null if there was nothing new to summarize.
// forceFullWeek: ignores lastRecapAt and always looks back a full 7 days —
// used by the manual "test" trigger so repeated testing isn't limited to
// "since the last successful run" (which is what the real Sunday cron uses).
async function generateRecapForUser(user, { forceFullWeek = false } = {}) {
  if (!user.github?.username) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since = forceFullWeek ? sevenDaysAgo : user.github.lastRecapAt || sevenDaysAgo;
  const commitSummary = await fetchCommitSummary(user.github.username, user.github.token, since);

  if (!commitSummary) return null;

  const generatedText = await aiService.generateRecapCaption({ commitSummary, tone: "authentic" });

  const post = await Post.create({
    userId: user._id,
    generatedText,
    topic: "Weekly progress recap",
    tone: "authentic",
    mode: "manual",
    source: "github-recap",
    status: "draft",
  });

  user.github.lastRecapAt = new Date();
  await user.save();

  return post;
}

module.exports = { fetchCommitSummary, generateRecapForUser };
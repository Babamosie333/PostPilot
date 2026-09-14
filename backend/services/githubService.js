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

  if (pushEvents.length === 0) return null;

  const byRepo = {};
  for (const event of pushEvents) {
    const repo = event.repo?.name || "unknown repo";
    byRepo[repo] = byRepo[repo] || [];
    for (const commit of event.payload?.commits || []) {
      // Skip merge-commit noise
      if (!/^merge/i.test(commit.message)) {
        byRepo[repo].push(commit.message.split("\n")[0]);
      }
    }
  }

  const lines = Object.entries(byRepo)
    .filter(([, messages]) => messages.length > 0)
    .map(([repo, messages]) => `${repo}:\n- ${messages.slice(0, 8).join("\n- ")}`);

  return lines.length > 0 ? lines.join("\n\n") : null;
}

// Generates (and saves as a draft) a weekly recap post for one user, based
// on their GitHub activity since their last recap. Returns the created
// Post, or null if there was nothing new to summarize.
async function generateRecapForUser(user) {
  if (!user.github?.username) return null;

  const since = user.github.lastRecapAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

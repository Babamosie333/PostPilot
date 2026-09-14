const cron = require("node-cron");
const Post = require("../models/Post");
const User = require("../models/User");
const linkedinService = require("./linkedinService");
const githubService = require("./githubService");

async function processDuePosts() {
  const now = new Date();
  const duePosts = await Post.find({
    status: "scheduled",
    scheduledFor: { $lte: now },
  });

  for (const post of duePosts) {
    try {
      const account = await linkedinService.getAccountForUser(post.userId);
      const linkedinPostId = await linkedinService.createPost({
        account,
        text: post.generatedText,
        imagePaths: post.images,
        videoPath: post.video,
        linkUrl: post.linkUrl,
        linkTitle: post.linkTitle,
      });

      post.status = "posted";
      post.postedAt = new Date();
      post.linkedinPostId = linkedinPostId;
      await post.save();

      console.log(`Posted: ${post._id}`);
    } catch (err) {
      post.status = "failed";
      post.errorMessage = err.message;
      await post.save();
      console.error(`Failed to post ${post._id}:`, err.message);
    }
  }
}

// Runs weekly for every user who's connected a GitHub username, generating
// a draft "weekly progress recap" post from their recent commit activity.
// Drafts land in Drafts for review — nothing auto-publishes from this.
async function processWeeklyRecaps() {
  const users = await User.find({ "github.username": { $ne: "" } });
  for (const user of users) {
    try {
      const post = await githubService.generateRecapForUser(user);
      if (post) console.log(`Generated GitHub recap draft for user ${user._id}: ${post._id}`);
    } catch (err) {
      console.error(`Failed to generate recap for user ${user._id}:`, err.message);
    }
  }
}

// Runs every minute. NOTE: only fires while the Render service is awake.
// On Render's free tier the service can sleep after inactivity — if that
// happens, scheduled posts will be delayed until the next request wakes it.
function startScheduler() {
  cron.schedule("* * * * *", () => {
    processDuePosts().catch((err) => console.error("Scheduler error:", err));
  });

  // Sunday 8pm server time — generates the week's recap drafts.
  cron.schedule("0 20 * * 0", () => {
    processWeeklyRecaps().catch((err) => console.error("Weekly recap error:", err));
  });

  console.log("Scheduler started - checking for due posts every minute, recaps every Sunday.");
}

module.exports = { startScheduler, processDuePosts, processWeeklyRecaps };

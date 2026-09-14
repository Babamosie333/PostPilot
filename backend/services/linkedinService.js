const axios = require("axios");
const fs = require("fs");
const User = require("../models/User");

const LINKEDIN_VERSION = "202601"; // update periodically per LinkedIn's versioning contract — versions sunset after ~1 year
const API_BASE = "https://api.linkedin.com";

function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    scope: "openid profile email w_member_social",
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

// Exchanges an OAuth code for LinkedIn tokens + profile info. Doesn't touch
// the database — since LinkedIn login is now how accounts are created in
// the first place, the caller (authRoutes) decides whether to create a new
// User or update an existing one (matched by LinkedIn memberId).
async function exchangeCodeForToken(code) {
  const res = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, expires_in, refresh_token, refresh_token_expires_in } = res.data;

  const userInfo = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  return {
    memberId: userInfo.data.sub,
    email: userInfo.data.email || "",
    name: userInfo.data.name || "",
    picture: userInfo.data.picture || "",
    linkedin: {
      memberId: userInfo.data.sub,
      accessToken: access_token,
      refreshToken: refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      refreshTokenExpiresAt: refresh_token_expires_in
        ? new Date(Date.now() + refresh_token_expires_in * 1000)
        : undefined,
    },
  };
}

// Returns the { memberId, accessToken } shape createPost() expects, for a given user.
async function getAccountForUser(userId) {
  const user = await User.findById(userId);
  if (!user?.linkedin?.memberId) {
    throw new Error("No LinkedIn account connected. Connect LinkedIn from the dashboard first.");
  }
  return user.linkedin;
}

// Registers an image upload via the Images API and returns the image URN to attach to a post
async function uploadImage(account, imagePath) {
  const initRes = await axios.post(
    `${API_BASE}/rest/images?action=initializeUpload`,
    {
      initializeUploadRequest: {
        owner: `urn:li:person:${account.memberId}`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  const { uploadUrl, image } = initRes.data.value;

  const imageBuffer = fs.readFileSync(imagePath);
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/octet-stream",
    },
  });

  return image; // urn:li:image:...
}

// Registers a video upload via the Videos API, uploads it in 4MB chunks per
// LinkedIn's returned byte-range instructions, then finalizes with the
// collected ETags (as uploadedPartIds) to link the parts together.
async function uploadVideo(account, videoPath) {
  const stats = fs.statSync(videoPath);

  const initRes = await axios.post(
    `${API_BASE}/rest/videos?action=initializeUpload`,
    {
      initializeUploadRequest: {
        owner: `urn:li:person:${account.memberId}`,
        fileSizeBytes: stats.size,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  const { video, uploadInstructions, uploadToken } = initRes.data.value;

  const fd = fs.openSync(videoPath, "r");
  const uploadedPartIds = [];
  try {
    for (const part of uploadInstructions) {
      const length = part.lastByte - part.firstByte + 1;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, part.firstByte);

      const putRes = await axios.put(part.uploadUrl, buffer, {
        headers: { "Content-Type": "application/octet-stream" },
      });

      const etag = putRes.headers["etag"];
      uploadedPartIds.push(etag);
    }
  } finally {
    fs.closeSync(fd);
  }

  await axios.post(
    `${API_BASE}/rest/videos?action=finalizeUpload`,
    {
      finalizeUploadRequest: {
        video,
        uploadToken: uploadToken || "",
        uploadedPartIds,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  return video; // urn:li:video:...
}

// account: { memberId, accessToken }
// imagePaths: string[] (0, 1, or many local file paths)
// videoPath: optional single local video file path
// linkUrl/linkTitle: optional single link attachment
//
// LinkedIn's /rest/posts content object only supports ONE attachment type
// per post. Priority when several are provided: link > video > images
// (images are dashboard-only context in that case, not sent to LinkedIn).
async function createPost({ account, text, imagePaths = [], videoPath, linkUrl, linkTitle }) {
  const body = {
    author: `urn:li:person:${account.memberId}`,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (linkUrl) {
    body.content = {
      article: {
        source: linkUrl,
        title: linkTitle || linkUrl,
      },
    };
  } else if (videoPath) {
    const videoUrn = await uploadVideo(account, videoPath);
    body.content = { media: { id: videoUrn } };
  } else if (imagePaths.length === 1) {
    const imageUrn = await uploadImage(account, imagePaths[0]);
    body.content = { media: { id: imageUrn } };
  } else if (imagePaths.length > 1) {
    const urns = [];
    for (const p of imagePaths) {
      urns.push(await uploadImage(account, p));
    }
    body.content = { multiImage: { images: urns.map((id) => ({ id })) } };
  }

  const res = await axios.post(`${API_BASE}/rest/posts`, body, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  return res.headers["x-restli-id"] || res.headers["x-linkedin-id"] || null;
}

// Fetches like/comment counts for a published post via LinkedIn's
// Community Management API. NOTE: this API requires LinkedIn's separate
// Community Management API product approval — it is NOT included in the
// self-serve "Share on LinkedIn" product this app otherwise uses. If your
// app doesn't have that access, this call will fail with a 403 and callers
// should fall back to letting the user enter stats manually.
async function getPostStats(account, postUrn) {
  const res = await axios.get(
    `${API_BASE}/rest/socialActions/${encodeURIComponent(postUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  return {
    likes: res.data.likesSummary?.aggregatedTotalLikes ?? 0,
    comments: res.data.commentsSummary?.aggregatedTotalComments ?? 0,
  };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  getAccountForUser,
  createPost,
  getPostStats,
};

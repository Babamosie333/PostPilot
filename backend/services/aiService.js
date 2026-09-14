const axios = require("axios");
const fs = require("fs");

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL = "openai/gpt-oss-120b";
const VISION_MODEL = "qwen/qwen3.6-27b";

const TONE_INSTRUCTIONS = {
  authentic: "authentic and not overly salesy, like a genuine personal update",
  casual: "casual and conversational, like talking to a friend",
  professional: "polished and professional, suitable for a recruiter audience",
  technical: "technical and detail-oriented, focused on the how, not just the what",
  celebratory: "upbeat and celebratory, leaning into the excitement of the moment",
};

function headers() {
  return {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Describe an uploaded image using a vision model
async function describeImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const res = await axios.post(
    GROQ_BASE,
    {
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image in one or two factual sentences — what's happening, who/what is visible, and the setting. No opinions, just description.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 200,
    },
    { headers: headers() }
  );

  return res.data.choices[0].message.content.trim();
}

// Generate a LinkedIn caption from description + optional context/topic/link/tone
async function generateCaption({ imageDescription, context, topic, linkUrl, hasVideo, tone }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.authentic;

  const prompt = `
You are writing a LinkedIn post for a computer applications student (BCA) who builds web, automation, and game dev projects, and posts about their learning/project journey.

${imageDescription ? `Image shows: ${imageDescription}` : ""}
${context ? `Extra context from the user: ${context}` : ""}
${topic ? `Topic/angle: ${topic}` : ""}
${hasVideo ? `A short demo video is attached to this post — reference it naturally (e.g. "check out the demo below" or "watch it in action"), without describing footage you haven't seen.` : ""}
${linkUrl ? `A link will be attached to this post (e.g. a demo or GitHub repo): ${linkUrl}. Reference it naturally in the closing line (e.g. "Link to the repo/demo below" or "Check it out — link attached"), but do not invent a description of what's at the link beyond what's given above.` : ""}

Write a LinkedIn post with:
- A short hook line (1 sentence)
- 2-3 short paragraphs, ${toneInstruction}
- 1 call-to-action or reflective closing line
- 3-5 relevant hashtags at the end

Return ONLY the post text, nothing else.
`.trim();

  const res = await axios.post(
    GROQ_BASE,
    {
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.85,
    },
    { headers: headers() }
  );

  return res.data.choices[0].message.content.trim();
}

// Generate a "weekly progress recap" caption from a summary of recent GitHub activity
async function generateRecapCaption({ commitSummary, tone }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.authentic;

  const prompt = `
You are writing a LinkedIn "weekly progress" post for a computer applications student (BCA) who builds web, automation, and game dev projects and shares their learning journey publicly.

Here is a summary of their GitHub activity from the past week:
${commitSummary}

Write a LinkedIn post with:
- A short hook line about the week's momentum
- 2-3 short paragraphs turning the commit activity into a narrative of what was built/learned/fixed — don't just list commit messages verbatim, synthesize them into a story
- 1 reflective closing line or a note on what's next
- 3-5 relevant hashtags at the end
- Tone: ${toneInstruction}

Return ONLY the post text, nothing else.
`.trim();

  const res = await axios.post(
    GROQ_BASE,
    {
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.85,
    },
    { headers: headers() }
  );

  return res.data.choices[0].message.content.trim();
}

module.exports = { describeImage, generateCaption, generateRecapCaption };

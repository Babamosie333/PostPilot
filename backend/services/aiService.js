const axios = require("axios");
const fs = require("fs");

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

// Candidate lists rather than one hardcoded name — both providers rename
// or retire models often enough that this has broken the app more than
// once already. Each list tries newest-first; whichever one actually
// works gets remembered (per server process) so later calls skip straight
// to it instead of re-trying dead names every time.
const GROQ_TEXT_MODELS = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"];
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash"];

let workingGroqTextModel = GROQ_TEXT_MODELS[0];
let workingGeminiModel = GEMINI_MODELS[0];

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const TONE_INSTRUCTIONS = {
  authentic: "authentic and not overly salesy, like a genuine personal update",
  casual: "casual and conversational, like talking to a friend",
  professional: "polished and professional, suitable for a recruiter audience",
  technical: "technical and detail-oriented, focused on the how, not just the what",
  celebratory: "upbeat and celebratory, leaning into the excitement of the moment",
};

function groqHeaders() {
  return {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Tries the remembered working Groq text model first, then the rest of
// the candidate list. Updates the remembered model on success.
async function callGroqText(prompt, { max_tokens = 500, temperature = 0.85 } = {}) {
  const order = [workingGroqTextModel, ...GROQ_TEXT_MODELS.filter((m) => m !== workingGroqTextModel)];
  let lastErr;
  for (const model of order) {
    try {
      const res = await axios.post(
        GROQ_BASE,
        { model, messages: [{ role: "user", content: prompt }], max_tokens, temperature },
        { headers: groqHeaders() }
      );
      workingGroqTextModel = model;
      return res.data.choices[0].message.content.trim();
    } catch (err) {
      lastErr = err;
      console.warn(`Groq model ${model} failed:`, JSON.stringify(err.response?.data || err.message));
    }
  }
  throw lastErr;
}

// Tries the remembered working Gemini model first, then the rest.
// Updates the remembered model on success. `parts` follows Gemini's
// content-parts format so this covers both text and vision calls.
async function callGemini(parts) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const order = [workingGeminiModel, ...GEMINI_MODELS.filter((m) => m !== workingGeminiModel)];
  let lastErr;
  for (const model of order) {
    try {
      const res = await axios.post(
        `${geminiUrl(model)}?key=${process.env.GEMINI_API_KEY}`,
        { contents: [{ parts }] },
        { headers: { "Content-Type": "application/json" } }
      );
      workingGeminiModel = model;
      return res.data.candidates[0].content.parts[0].text.trim();
    } catch (err) {
      lastErr = err;
      console.warn(`Gemini model ${model} failed:`, JSON.stringify(err.response?.data || err.message));
    }
  }
  throw lastErr;
}

// Runs a Groq text call, falling back to Gemini if every Groq candidate
// fails and a GEMINI_API_KEY is configured.
async function generateText(prompt, options) {
  try {
    return await callGroqText(prompt, options);
  } catch (groqErr) {
    if (!process.env.GEMINI_API_KEY) throw groqErr;
    try {
      console.warn("All Groq text models failed, falling back to Gemini...");
      return await callGemini([{ text: prompt }]);
    } catch {
      throw groqErr;
    }
  }
}

async function geminiDescribeImage(base64Image, mimeType) {
  return callGemini([
    {
      text: "Describe this image in one or two factual sentences — what's happening, who/what is visible, and the setting. No opinions, just description.",
    },
    { inline_data: { mime_type: mimeType, data: base64Image } },
  ]);
}

// Describe an uploaded image using Gemini — Groq has no vision-capable
// model on this account, so this goes straight there rather than trying
// (and failing) a Groq call first.
async function describeImage(imagePath) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Image analysis needs a GEMINI_API_KEY — Groq's models on this account don't support vision. Add a free key from https://aistudio.google.com/apikey."
    );
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  try {
    return await geminiDescribeImage(base64Image, mimeType);
  } catch (err) {
    console.error("Gemini image analysis failed:", JSON.stringify(err.response?.data || err.message));
    throw err;
  }
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

  return generateText(prompt);
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

  return generateText(prompt);
}

// General-purpose assistant reply — answers questions normally, and only
// writes LinkedIn-post-formatted text (hook/paragraphs/hashtags) if the
// user actually asks for a post/caption/draft. Does not save anything —
// the caller decides whether to persist the reply as a draft.
async function generateAssistantReply({ message, history = [], tone }) {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.authentic;

  const transcript = history
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.text}`)
    .join("\n");

  const prompt = `
You are the AI assistant inside PostPilot, a LinkedIn-posting tool for a computer applications student. You help with two kinds of requests:

1. General questions — about their projects, LinkedIn strategy, coding, or anything else. Answer these directly and conversationally, like a normal helpful chat assistant. Do NOT format these as a LinkedIn post (no hashtags, no "hook line", no forced structure) unless the question is specifically about how to write one.

2. Requests to write/draft a LinkedIn post or caption — only for these, write it as an actual LinkedIn post: a short hook line, 2-3 short paragraphs (${toneInstruction}), a closing line, and 3-5 relevant hashtags.

Use your judgment on which mode fits the message below. Don't announce which mode you're using — just respond appropriately.

${transcript ? `Conversation so far:\n${transcript}\n` : ""}
User: ${message}

Respond with ONLY your reply, nothing else.
`.trim();

  return generateText(prompt, { max_tokens: 600, temperature: 0.8 });
}

module.exports = { describeImage, generateCaption, generateRecapCaption, generateAssistantReply };
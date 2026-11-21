import "dotenv/config";
import express from "express";
import multer from "multer";
import Replicate from "replicate";
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// --- OpenAI-compatible client ---
// SDK throws at construction if apiKey is empty — placeholder lets the server
// start without a key; the /api/generate route reports the missing key properly.
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-missing",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-1";

// --- Uploads (memory, 10MB max, images only) ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP or GIF images are allowed"));
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: IMAGE_MODEL, hasKey: Boolean(process.env.OPENAI_API_KEY) });
});

// Generate ad
app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", quality = "high" } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a product image." });
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Please write a prompt describing the ad you want." });
    }

    // Turn the uploaded buffer into a File the SDK accepts
    const ext = req.file.mimetype.split("/")[1].replace("jpeg", "jpg");
    const imageFile = new File([req.file.buffer], `product.${ext}`, { type: req.file.mimetype });

    const result = await client.images.edit({
      model: IMAGE_MODEL,
      image: imageFile,
      prompt: buildAdPrompt(prompt),
      size,
      quality,
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: "The image API returned no image." });
    }

    res.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error(err);
    const message = err?.error?.message || err?.message || "Unexpected server error";
    res.status(500).json({ error: message });
  }
});

// Wrap the user prompt with a professional-ad directive (kept in English for model reliability)
function buildAdPrompt(userPrompt) {
  return [
    "Create a professional, high-end advertising image for this product.",
    "Requirements:",
    "- Keep the product from the reference image as the clear hero of the composition, preserving its real look, colors and branding.",
    "- Studio-quality commercial photography style: clean composition, flattering lighting, subtle realistic shadows.",
    "- Add ad copy (headline/tagline) only if the user asks for it in the prompt; render any text crisply and correctly.",
    "- Modern, premium look suitable for social media advertising (Instagram / Facebook).",
    "- No watermarks, no distorted text, no extra logos.",
    "",
    "User's request:",
    userPrompt,
  ].join("\n");
}
// توليد فيديو من صورة
app.post("/api/generate-video", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "REPLICATE_API_TOKEN is not configured." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image." });
    }

    // تحويل الصورة إلى base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // استخدام نموذج Stable Video Diffusion
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          input_image: base64Image,
          video_length: "25_frames_with_svd_xt",
          sizing_strategy: "maintain_aspect_ratio",
          frames_per_second: 6,
          motion_bucket_id: 127,
          cond_aug: 0.02
        }
      }
    );

    res.json({ video: output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Product Ad Generator running: http://localhost:${PORT}`);
});

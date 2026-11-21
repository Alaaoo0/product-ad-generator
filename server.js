import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-missing",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const IMAGE_MODEL = process.env.IMAGE_MODEL || "dall-e-3";

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

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: IMAGE_MODEL,
    hasKey: Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY !== "sk-missing"
  });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", quality = "high" } = req.body;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-missing") {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a product image." });
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Please write a prompt describing the ad you want." });
    }

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
    res.status(500).json({ error: err?.error?.message || err?.message || "Unexpected server error" });
  }
});

app.post("/api/generate-video", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.STABILITY_API_KEY) {
      return res.status(500).json({ error: "STABILITY_API_KEY is not configured. Add it in Render Environment Variables." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image." });
    }

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("image", blob, "image." + req.file.mimetype.split("/")[1]);
    formData.append("seed", "0");
    formData.append("cfg_scale", "1.8");
    formData.append("motion_bucket_id", "127");

    const response = await fetch("https://api.stability.ai/v2beta/image-to-video", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STABILITY_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Stability API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    res.json({ generationId: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/video-result/:id", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.stability.ai/v2beta/image-to-video/result/${req.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: "video/*",
        },
      }
    );

    if (response.status === 202) {
      return res.json({ status: "processing" });
    }

    const videoBuffer = await response.arrayBuffer();
    res.set("Content-Type", "video/mp4");
    res.send(Buffer.from(videoBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildAdPrompt(userPrompt) {
  return [
    "Create a professional, high-end advertising image for this product.",
    "Requirements:",
    "- Keep the product from the reference image as the clear hero of the composition.",
    "- Studio-quality commercial photography style.",
    "- Modern, premium look suitable for social media.",
    "- No watermarks, no distorted text.",
    "",
    "User's request:",
    userPrompt,
  ].join("\n");
}

app.listen(PORT, () => {
  console.log(`✅ Product Ad Generator running: http://localhost:${PORT}`);
});

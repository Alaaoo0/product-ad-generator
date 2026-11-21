import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: "flux-kontext (Replicate)",
    hasKey: Boolean(process.env.REPLICATE_API_TOKEN),
  });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a product image" });
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Please write a prompt" });
    }

    // تحويل الصورة إلى base64 data URL
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const fullPrompt = [
      "Professional commercial advertising photograph of this exact product.",
      "Keep the product identical to the reference image.",
      "Studio lighting, premium background, luxury brand aesthetic.",
      "High-end product photography for Instagram ad.",
      "User request:",
      prompt,
    ].join(" ");

    // استدعاء Replicate API
    const response = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-dev/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt_image: base64Image,
            prompt: fullPrompt,
            guidance_scale: 3.5,
            num_steps: 50,
            aspect_ratio: "1:1",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Replicate error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();

    // Replicate يعمل async - نحتاج انتظار النتيجة
    let prediction = data;
    let attempts = 0;
    while (prediction.status !== "succeeded" && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
        }
      );
      prediction = await statusRes.json();
      attempts++;
      if (prediction.status === "failed") {
        throw new Error("Prediction failed: " + prediction.error);
      }
    }

    if (prediction.status !== "succeeded") {
      throw new Error("Prediction timed out");
    }

    // النتيجة قد تكون رابط أو base64
    let output = prediction.output;
    if (Array.isArray(output)) output = output[0];

    if (output.startsWith("http")) {
      const imgRes = await fetch(output);
      const buffer = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buffer).toString("base64");
      res.json({ image: `data:image/png;base64,${b64}` });
    } else if (output.startsWith("data:")) {
      res.json({ image: output });
    } else {
      res.json({ image: `data:image/png;base64,${output}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-video", (req, res) => {
  res.status(501).json({ error: "Video coming soon" });
});

app.listen(PORT, () => {
  console.log(`✅ Running on http://localhost:${PORT}`);
});

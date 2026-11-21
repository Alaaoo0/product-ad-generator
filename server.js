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
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP images are allowed"));
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: "flux-kontext (Pollinations)", hasKey: true });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Please upload a product image." });
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Please write a prompt." });
    }

    const [width, height] = size.split("x").map(Number);
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const fullPrompt = [
      "Professional advertising image of this product.",
      "Studio-quality commercial photography.",
      "Premium look suitable for social media.",
      "User request:",
      prompt,
    ].join(" ");

    const encodedPrompt = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flux-kontext",
        image: base64,
        width: width || 1024,
        height: height || 1024,
        nologo: true,
        private: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pollinations error (${response.status}): ${text.slice(0, 200)}`);
    }

    const buffer = await response.arrayBuffer();
    const b64 = Buffer.from(buffer).toString("base64");
    res.json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-video", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.STABILITY_API_KEY) {
      return res.status(500).json({ error: "STABILITY_API_KEY is not configured." });
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

app.listen(PORT, () => {
  console.log(`✅ Product Ad Generator running: http://localhost:${PORT}`);
});

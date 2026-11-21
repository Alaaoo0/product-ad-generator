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
  res.json({ ok: true, model: "pollinations-free" });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const [width, height] = size.split("x").map(Number);
    const fullPrompt = encodeURIComponent(
      `Professional advertising photo: ${prompt}. High quality, commercial photography, studio lighting, premium product advertisement`
    );
    
    const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=${width || 1024}&height=${height || 1024}&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Pollinations failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const b64 = Buffer.from(buffer).toString("base64");
    res.json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-video", (req, res) => {
  res.status(501).json({ error: "Video generation requires STABILITY_API_KEY. Add it in Render Environment Variables." });
});

app.listen(PORT, () => {
  console.log(`✅ Running on http://localhost:${PORT}`);
});

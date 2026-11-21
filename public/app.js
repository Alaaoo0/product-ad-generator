// عناصر الصفحة
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const dropPlaceholder = document.getElementById("dropPlaceholder");
const preview = document.getElementById("preview");
const removeImageBtn = document.getElementById("removeImage");
const promptInput = document.getElementById("prompt");
const sizeSelect = document.getElementById("size");
const qualitySelect = document.getElementById("quality");
const generateBtn = document.getElementById("generateBtn");
const formError = document.getElementById("formError");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const resultState = document.getElementById("resultState");
const errorState = document.getElementById("errorState");
const resultImage = document.getElementById("resultImage");
const downloadBtn = document.getElementById("downloadBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const retryBtn = document.getElementById("retryBtn");
const apiError = document.getElementById("apiError");

let selectedFile = null;

// ---------- رفع الصورة ----------
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", () => setFile(fileInput.files[0]));

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

removeImageBtn.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  preview.hidden = true;
  dropPlaceholder.hidden = false;
  removeImageBtn.hidden = true;
  validate();
});

function setFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
    showFormError("الرجاء اختيار صورة بصيغة PNG أو JPG أو WEBP.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showFormError("حجم الصورة كبير — الحد الأقصى 10MB.");
    return;
  }
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  dropPlaceholder.hidden = true;
  removeImageBtn.hidden = false;
  hideFormError();
  validate();
}

// ---------- التحقق من النموذج ----------
promptInput.addEventListener("input", validate);

function validate() {
  const ok = selectedFile && promptInput.value.trim().length > 0;
  generateBtn.disabled = !ok;
  return ok;
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}
function hideFormError() { formError.hidden = true; }

// ---------- حالات النتيجة ----------
function setState(state) {
  emptyState.hidden = state !== "empty";
  loadingState.hidden = state !== "loading";
  resultState.hidden = state !== "result";
  errorState.hidden = state !== "error";
}

// ---------- التوليد ----------
generateBtn.addEventListener("click", generate);
regenerateBtn.addEventListener("click", generate);
retryBtn.addEventListener("click", generate);

async function generate() {
  if (!validate()) return;
  hideFormError();
  setState("loading");
  generateBtn.disabled = true;

  try {
    const fd = new FormData();
    fd.append("image", selectedFile);
    fd.append("prompt", promptInput.value.trim());
    fd.append("size", sizeSelect.value);
    fd.append("quality", qualitySelect.value);

    const res = await fetch("/api/generate", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "صار خطأ غير متوقع.");

    resultImage.src = data.image;
    downloadBtn.href = data.image;
    setState("result");
  } catch (err) {
    apiError.textContent = err.message || "تعذّر توليد الإعلان — تأكد من مفتاح API وجرّب مرة ثانية.";
    setState("error");
  } finally {
    validate();
  }
}
// === ميزة توليد الفيديو ===
const generateVideoBtn = document.getElementById('generateVideoBtn');
const videoResult = document.createElement('div');
videoResult.id = 'videoResult';
document.querySelector('.container').appendChild(videoResult);

generateVideoBtn.addEventListener('click', async () => {
  const imageInput = document.getElementById('imageInput');
  const promptInput = document.getElementById('promptInput');
  
  if (!imageInput.files[0]) {
    alert('الرجاء رفع صورة المنتج أولاً');
    return;
  }
  
  if (!promptInput.value.trim()) {
    alert('الرجاء كتابة وصف الإعلان');
    return;
  }
  
  // عرض رسالة التحميل
  videoResult.innerHTML = '<p class="loading-video">🎬 جاري توليد الفيديو... قد يستغرق 30-60 ثانية</p>';
  generateVideoBtn.disabled = true;
  generateVideoBtn.textContent = 'جاري التوليد...';
  
  try {
    const formData = new FormData();
    formData.append('image', imageInput.files[0]);
    formData.append('prompt', promptInput.value);
    
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // عرض الفيديو
    if (data.video) {
      videoResult.innerHTML = `
        <h3>🎥 الفيديو الناتج:</h3>
        <video controls autoplay loop>
          <source src="${data.video}" type="video/mp4">
          متصفحك لا يدعم تشغيل الفيديو
        </video>
        <br>
        <a href="${data.video}" download="ad-video.mp4" class="download-btn">⬇️ تحميل الفيديو</a>
      `;
    }
    
  } catch (error) {
    videoResult.innerHTML = `<p style="color: red;">❌ خطأ: ${error.message}</p>`;
  } finally {
    generateVideoBtn.disabled = false;
    generateVideoBtn.textContent = 'توليد فيديو';
  }
});

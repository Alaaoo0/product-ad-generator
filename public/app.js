// === عناصر DOM ===
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const dropPlaceholder = document.getElementById('dropPlaceholder');
const removeImageBtn = document.getElementById('removeImage');
const promptInput = document.getElementById('prompt');
const sizeSelect = document.getElementById('size');
const qualitySelect = document.getElementById('quality');
const generateBtn = document.getElementById('generateBtn');
const generateVideoBtn = document.getElementById('generateVideoBtn');
const formError = document.getElementById('formError');

// حالات النتيجة
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const resultState = document.getElementById('resultState');
const videoResultState = document.getElementById('videoResultState');
const errorState = document.getElementById('errorState');
const resultImage = document.getElementById('resultImage');
const resultVideo = document.getElementById('resultVideo');
const downloadBtn = document.getElementById('downloadBtn');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const regenerateVideoBtn = document.getElementById('regenerateVideoBtn');
const retryBtn = document.getElementById('retryBtn');
const apiError = document.getElementById('apiError');

// === حالة التطبيق ===
let uploadedFile = null;

// === إدارة رفع الصورة ===
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

// السحب والإفلات
['dragenter', 'dragover'].forEach(event => {
  dropzone.addEventListener(event, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(event => {
  dropzone.addEventListener(event, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
  });
});

dropzone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
  // التحقق من النوع والحجم
  if (!file.type.startsWith('image/')) {
    showError('الرجاء اختيار ملف صورة فقط (PNG, JPG, WEBP)');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('حجم الصورة يتجاوز 10MB');
    return;
  }

  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.hidden = false;
    dropPlaceholder.hidden = true;
    removeImageBtn.hidden = false;
    updateButtonsState();
  };
  reader.readAsDataURL(file);
}

removeImageBtn.addEventListener('click', () => {
  uploadedFile = null;
  fileInput.value = '';
  preview.hidden = true;
  dropPlaceholder.hidden = false;
  removeImageBtn.hidden = true;
  updateButtonsState();
});

// === التحقق من صحة النموذج ===
function updateButtonsState() {
  const hasImage = uploadedFile !== null;
  const hasPrompt = promptInput.value.trim().length > 0;
  generateBtn.disabled = !(hasImage && hasPrompt);
  generateVideoBtn.disabled = !hasImage; // الفيديو يحتاج صورة فقط
}

promptInput.addEventListener('input', updateButtonsState);

// === إظهار/إخفاء الحالات ===
function showState(stateName) {
  [emptyState, loadingState, resultState, videoResultState, errorState].forEach(s => s.hidden = true);
  if (stateName === 'empty') emptyState.hidden = false;
  if (stateName === 'loading') loadingState.hidden = false;
  if (stateName === 'result') resultState.hidden = false;
  if (stateName === 'video') videoResultState.hidden = false;
  if (stateName === 'error') errorState.hidden = false;
}

function showError(message) {
  apiError.textContent = message;
  showState('error');
}

function hideError() {
  formError.hidden = true;
  formError.textContent = '';
}

// === توليد صورة الإعلان ===
generateBtn.addEventListener('click', async () => {
  if (!uploadedFile || !promptInput.value.trim()) return;

  hideError();
  showState('loading');
  loadingText.textContent = '🎨 عم نجهز إعلانك... ممكن ياخد دقيقة تقريباً';
  generateBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('prompt', promptInput.value.trim());
    formData.append('size', sizeSelect.value);
    formData.append('quality', qualitySelect.value);

    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ غير متوقع');
    }

    resultImage.src = data.image;
    downloadBtn.href = data.image;
    showState('result');
  } catch (error) {
    showError(error.message);
  } finally {
    generateBtn.disabled = false;
    updateButtonsState();
  }
});

// === توليد فيديو الإعلان ===
generateVideoBtn.addEventListener('click', async () => {
  if (!uploadedFile) return;

  hideError();
  showState('loading');
  loadingText.textContent = '🎬 جاري توليد الفيديو... قد يستغرق 30-60 ثانية';
  generateVideoBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('prompt', promptInput.value.trim());

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'فشل توليد الفيديو');
    }

    // إذا كان الفيديو رابط
    if (data.video) {
      resultVideo.src = data.video;
      downloadVideoBtn.href = data.video;
      showState('video');
    }
    // إذا كان الفيديو base64
    else if (data.videoBase64) {
      resultVideo.src = `data:video/mp4;base64,${data.videoBase64}`;
      downloadVideoBtn.href = resultVideo.src;
      showState('video');
    }
    else {
      throw new Error('لم يتم استلام الفيديو من الخادم');
    }
  } catch (error) {
    showError(error.message);
  } finally {
    generateVideoBtn.disabled = false;
    updateButtonsState();
  }
});

// === أزرار إعادة التوليد ===
regenerateBtn.addEventListener('click', () => {
  generateBtn.click();
});

regenerateVideoBtn.addEventListener('click', () => {
  generateVideoBtn.click();
});

retryBtn.addEventListener('click', () => {
  showState('empty');
  hideError();
});

// === تهيئة ===
showState('empty');

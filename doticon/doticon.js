(function () {
  const fileInput = document.querySelector('[data-input-file]');
  const dotSizeInput = document.querySelector('[data-input-dotsize]');
  const spacingInput = document.querySelector('[data-input-spacing]');
  const useColorInput = document.querySelector('[data-input-colorize]');
  const dotColorInput = document.querySelector('[data-input-dotcolor]');
  const backgroundColorInput = document.querySelector('[data-input-bgcolor]');
  const downloadButton = document.querySelector('[data-action-download]');
  const dotSizeOutput = document.querySelector('[data-output="dotSize"]');
  const spacingOutput = document.querySelector('[data-output="spacing"]');
  const message = document.querySelector('[data-state-message]');
  const canvas = document.querySelector('.doticon-canvas');
  const ctx = canvas.getContext('2d');
  const dropzone = document.querySelector('[data-dropzone]');
  const previewWrapper = document.querySelector('.doticon-preview__canvas-wrapper');
  const loadingIndicator = document.querySelector('[data-loading]');

  const MAX_DIMENSION = 640;
  const state = {
    image: null,
    objectUrl: null,
  };

  function revokeObjectUrl() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatNumber(value) {
    return Math.round(Number(value));
  }

  function updateOutputs() {
    if (dotSizeOutput) {
      dotSizeOutput.textContent = formatNumber(dotSizeInput.value);
    }
    if (spacingOutput) {
      spacingOutput.textContent = formatNumber(spacingInput.value);
    }
  }

  function setMessage(text) {
    if (message) {
      message.textContent = text;
    }
  }

  function enableDownload(enable) {
    if (downloadButton) {
      downloadButton.disabled = !enable;
    }
  }

  function setLoading(isLoading) {
    if (loadingIndicator) {
      if (isLoading) {
        loadingIndicator.removeAttribute('hidden');
      } else {
        loadingIndicator.setAttribute('hidden', '');
      }
    }

    if (previewWrapper) {
      if (isLoading) {
        previewWrapper.setAttribute('aria-busy', 'true');
      } else {
        previewWrapper.removeAttribute('aria-busy');
      }
    }
  }

  function renderDotIcon() {
    const image = state.image;
    if (!image) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      enableDownload(false);
      return;
    }

    const dotRadius = Number(dotSizeInput.value) || 6;
    const spacing = Number(spacingInput.value) || 4;
    const useOriginalColors = useColorInput.checked;
    const dotColor = dotColorInput.value || '#9fe4d0';
    const backgroundColor = backgroundColorInput.value || '#0f172a';

    const aspect = image.width / image.height;
    let targetWidth = image.width;
    let targetHeight = image.height;

    if (Math.max(targetWidth, targetHeight) > MAX_DIMENSION) {
      if (targetWidth > targetHeight) {
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.round(MAX_DIMENSION / aspect);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.round(MAX_DIMENSION * aspect);
      }
    }

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = targetWidth;
    sourceCanvas.height = targetHeight;
    const sctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const imageData = sctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;

    const minStep = Math.max(1, dotRadius * 2 + spacing);
    const columns = Math.max(1, Math.floor(targetWidth / minStep));
    const rows = Math.max(1, Math.floor(targetHeight / minStep));
    const cellWidth = targetWidth / columns;
    const cellHeight = targetHeight / rows;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const minRadius = Math.max(0.5, dotRadius * 0.1);

    for (let row = 0; row < rows; row += 1) {
      const startY = Math.floor(row * cellHeight);
      const endY = Math.min(targetHeight, Math.floor((row + 1) * cellHeight));
      for (let col = 0; col < columns; col += 1) {
        const startX = Math.floor(col * cellWidth);
        const endX = Math.min(targetWidth, Math.floor((col + 1) * cellWidth));
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let brightnessTotal = 0;
        let count = 0;

        for (let y = startY; y < endY; y += 1) {
          const offsetBase = y * targetWidth * 4;
          for (let x = startX; x < endX; x += 1) {
            const index = offsetBase + x * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            rTotal += r;
            gTotal += g;
            bTotal += b;
            brightnessTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
            count += 1;
          }
        }

        if (count === 0) {
          continue;
        }

        const avgR = rTotal / count;
        const avgG = gTotal / count;
        const avgB = bTotal / count;
        const brightness = clamp(brightnessTotal / (count * 255), 0, 1);
        const rawRadius = dotRadius * (1 - brightness);
        const radius = clamp(rawRadius, minRadius, dotRadius);

        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;

        if (useOriginalColors) {
          ctx.fillStyle = `rgb(${avgR.toFixed(0)}, ${avgG.toFixed(0)}, ${avgB.toFixed(0)})`;
        } else {
          ctx.fillStyle = dotColor;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    enableDownload(true);
    setMessage('Можно скачать результат или продолжить настройку параметров.');
  }

  function loadImage(file) {
    if (!file) {
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    revokeObjectUrl();
    state.objectUrl = url;

    setLoading(true);
    setMessage('Изображение загружено, создаём точечную версию…');
    enableDownload(false);

    image.onload = () => {
      state.image = image;
      window.requestAnimationFrame(() => {
        try {
          renderDotIcon();
        } catch (error) {
          console.error('doticon: render failed', error);
          setMessage('Не удалось обработать изображение. Попробуйте другой файл.');
          enableDownload(false);
        } finally {
          setLoading(false);
        }
      });
    };

    image.onerror = () => {
      setMessage('Не удалось загрузить изображение. Попробуйте другой файл.');
      enableDownload(false);
      revokeObjectUrl();
      state.image = null;
      setLoading(false);
    };

    image.src = url;
  }

  function updateFileInputFiles(file) {
    if (!fileInput || !file) {
      return;
    }

    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    } catch (error) {
      // В некоторых браузерах нельзя программно обновить список файлов — просто игнорируем.
    }
  }

  function handleFileInput(event) {
    const [file] = event.target.files || [];
    loadImage(file);
  }

  function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event) {
    preventDefaults(event);
    dropzone.classList.remove('is-dragover');
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const [file] = files;
      updateFileInputFiles(file);
      loadImage(file);
    }
  }

  function handleDragOver(event) {
    preventDefaults(event);
    dropzone.classList.add('is-dragover');
  }

  function handleDragLeave(event) {
    preventDefaults(event);
    dropzone.classList.remove('is-dragover');
  }

  function downloadCanvas() {
    if (!state.image) {
      return;
    }
    const link = document.createElement('a');
    link.download = 'doticon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleFileInput);
  }

  [dotSizeInput, spacingInput, useColorInput, dotColorInput, backgroundColorInput].forEach((input) => {
    if (!input) {
      return;
    }
    input.addEventListener('input', () => {
      updateOutputs();
      renderDotIcon();
    });
  });

  updateOutputs();

  if (downloadButton) {
    downloadButton.addEventListener('click', downloadCanvas);
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, handleDragOver);
    });
    ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, handleDragLeave);
    });
    dropzone.addEventListener('drop', handleDrop);
  }

  window.addEventListener('beforeunload', revokeObjectUrl);
})();

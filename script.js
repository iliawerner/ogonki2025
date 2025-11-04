(function () {
  const countdown = document.querySelector('[data-countdown]');
  if (countdown) {
    const parts = countdown.querySelectorAll('[data-countdown-part]');
    const targetDate = new Date(countdown.dataset.countdown);

    function formatPart(value) {
      return String(value).padStart(2, '0');
    }

    function updateCountdown() {
      const now = new Date();
      let diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        diff = 0;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      parts.forEach((part) => {
        const type = part.dataset.countdownPart;
        switch (type) {
          case 'days':
            part.textContent = formatPart(days);
            break;
          case 'hours':
            part.textContent = formatPart(hours);
            break;
          case 'minutes':
            part.textContent = formatPart(minutes);
            break;
          case 'seconds':
            part.textContent = formatPart(seconds);
            break;
          default:
            break;
        }
      });
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  const cryptoNote = document.querySelector('.crypto__note');
  const addressButtons = document.querySelectorAll('[data-copy]');

  addressButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = value;
          tempInput.setAttribute('readonly', '');
          tempInput.style.position = 'absolute';
          tempInput.style.left = '-9999px';
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }
        if (cryptoNote) {
          cryptoNote.textContent = 'Адрес скопирован: ' + value;
        }
      } catch (error) {
        if (cryptoNote) {
          cryptoNote.textContent = 'Не удалось скопировать адрес, попробуйте вручную.';
        }
      }
    });
  });
})();

export const triggerHrefDownload = (href, filename, options = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Downloads are only available in the browser.');
  }

  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  link.target = '_self';

  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    if (options.revokeObjectUrl) {
      window.URL.revokeObjectURL(href);
    }
  }, 1000);
};

export const triggerFileDownload = (blob, filename) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Downloads are only available in the browser.');
  }

  const url = window.URL.createObjectURL(blob);
  triggerHrefDownload(url, filename, { revokeObjectUrl: true });
};

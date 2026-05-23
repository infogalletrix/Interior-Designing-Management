export const showToast = (message, type = 'success') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'error' ? '#ef4444' : '#10b981';
  toast.style.cssText = `
    background-color: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  `;
  toast.innerText = message;
  
  // Dismiss on click
  toast.onclick = () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
};

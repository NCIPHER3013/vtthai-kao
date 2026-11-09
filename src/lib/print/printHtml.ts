export function printHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    setTimeout(() => iframe.remove(), 500);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      win.focus();
      win.print();
    }, 150);
    setTimeout(cleanup, 120000);
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

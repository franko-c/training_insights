// Browser Console Script to Download Page HTML
// Usage: Open Chrome DevTools (F12), go to Console tab, paste and run this code.

(function() {
  try {
    // Get the full HTML of the page
    const htmlContent = document.documentElement.outerHTML;

    // Create a blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = 'page_content.html';
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Page HTML downloaded as page_content.html');
  } catch (e) {
    console.error('Failed to extract page content:', e);
  }
})();

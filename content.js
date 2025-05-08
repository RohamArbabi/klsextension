document.addEventListener('DOMContentLoaded', function() {
    // Listen for scan requests from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'scan') {
            try {
                // Get visible text from the page
                const textContent = document.body.innerText;
                
                // Send content to background script for analysis
                chrome.runtime.sendMessage({
                    type: 'scan',
                    content: textContent
                }, function(response) {
                    sendResponse(response);
                });
            } catch (error) {
                sendResponse({ error: error.message });
            }
        }
        return true;
    });
});

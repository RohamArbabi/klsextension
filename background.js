// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'analyze') {
        try {
            console.log('Background script received message:', request);
            
            // Forward the message to the content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length > 0) {
                    const tab = tabs[0];
                    console.log('Sending message to tab:', tab.id);
                    
                    chrome.tabs.sendMessage(tab.id, request, function(response) {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending message to content script:', chrome.runtime.lastError);
                            sendResponse({
                                error: chrome.runtime.lastError.message,
                                summary: 'Error occurred during analysis',
                                violations: [],
                                recommendations: []
                            });
                        } else {
                            console.log('Received response from content script:', response);
                            sendResponse(response);
                        }
                    });
                } else {
                    console.error('No active tab found');
                    sendResponse({
                        error: 'No active tab found',
                        summary: 'No active tab found',
                        violations: [],
                        recommendations: []
                    });
                }
            });
        } catch (error) {
            console.error('Error in background script:', error);
            sendResponse({
                error: error.message,
                summary: 'Error occurred during analysis',
                violations: [],
                recommendations: []
            });
        }
    }
    return true;
});

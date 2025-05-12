// Configuration for the API - hardcoded here for service worker
// In a production environment, these would be securely stored
const API_CONFIG = {
    // Default empty values will be replaced with actual values from chrome.storage
    OPENAI_API_KEY: '',
    OPENAI_ENDPOINT: 'https://api.openai.com/v1/chat/completions'
};

// Function to load configuration from storage
async function loadConfigFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiKey', 'apiEndpoint'], (result) => {
            if (result.apiKey) {
                API_CONFIG.OPENAI_API_KEY = result.apiKey;
            }
            if (result.apiEndpoint) {
                API_CONFIG.OPENAI_ENDPOINT = result.apiEndpoint;
            }
            console.log('Configuration loaded from storage');
            resolve(API_CONFIG);
        });
    });
}

// Load configuration on startup
loadConfigFromStorage().then(() => {
    console.log('Background service initialized');
    // Initialize tabs after config is loaded
    initializeAllTabs();
});

// Function to initialize content scripts in a tab
async function initializeContentScript(tabId) {
    try {
        // Skip chrome:// and other restricted URLs
        const tab = await chrome.tabs.get(tabId);
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
            tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
            console.log(`Skipping restricted URL: ${tab.url}`);
            return;
        }
        
        // Inject content script if needed
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            // Initialize the content script with API key
            await chrome.tabs.sendMessage(tabId, {
                type: 'initialize',
                apiKey: API_CONFIG.OPENAI_API_KEY,
                endpoint: API_CONFIG.OPENAI_ENDPOINT
            });
            
            console.log(`Content script initialized in tab ${tabId}`);
        } catch (error) {
            console.error(`Could not initialize tab ${tabId}:`, error);
        }
    } catch (error) {
        console.error(`Error getting tab ${tabId}:`, error);
    }
}

// Function to initialize all existing tabs
async function initializeAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        for (const tab of tabs) {
            initializeContentScript(tab.id);
        }
    });
    
    // Set up listeners for future tabs
    setupTabListeners();
}

// Set up listeners for tab events
function setupTabListeners() {
    // Initialize content script when a new tab is created
    chrome.tabs.onCreated.addListener(tab => {
        // Wait a moment for the page to load
        setTimeout(() => {
            initializeContentScript(tab.id);
        }, 1000);
    });
    
    // Re-initialize when tab is updated (URL changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        // Only run when the page is fully loaded
        if (changeInfo.status === 'complete') {
            initializeContentScript(tabId);
        }
    });
}

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

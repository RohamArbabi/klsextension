document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const scanButton = document.getElementById('scan-page');
    const checkButton = document.getElementById('check-content');
    const conductText = document.getElementById('conduct-text');

    // Load saved code of conduct
    chrome.storage.local.get(['codeOfConduct'], function(result) {
        if (result.codeOfConduct) {
            conductText.value = result.codeOfConduct;
        }
    });

    // Save code of conduct when changed
    conductText.addEventListener('input', function() {
        chrome.storage.local.set({ codeOfConduct: conductText.value });
    });

    // Send message to background script
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessage('user', message);
            userInput.value = '';
            
            // Send message to background script
            chrome.runtime.sendMessage({
                type: 'chat',
                message: message,
                codeOfConduct: conductText.value
            }, function(response) {
                if (response && response.message) {
                    addMessage('ai', response.message);
                }
            });
        }
    }

    // Add message to chat box
    function addMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Scan current page
    scanButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'scan',
                codeOfConduct: conductText.value
            }, function(response) {
                if (response && response.results) {
                    addMessage('ai', 'Scan results: ' + response.results);
                }
            });
        });
    });

    // Check content
    checkButton.addEventListener('click', function() {
        const content = prompt("Enter the content you want to check:");
        if (content) {
            chrome.runtime.sendMessage({
                type: 'check',
                content: content,
                codeOfConduct: conductText.value
            }, function(response) {
                if (response && response.assessment) {
                    addMessage('ai', 'Content assessment: ' + response.assessment);
                }
            });
        }
    });
});

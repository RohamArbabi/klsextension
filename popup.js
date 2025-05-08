document.addEventListener('DOMContentLoaded', function() {
    const resultsDiv = document.getElementById('results');
    const scanButton = document.getElementById('scan-page');
    const checkButton = document.getElementById('check-content');

    // Local code of conduct
    const CODE_OF_CONDUCT = `1. No hate speech or discrimination
2. No illegal activities
3. No explicit sexual content
4. No harassment or bullying
5. No promotion of violence
6. No misinformation or fake news
7. No unauthorized sharing of personal information`;

    // Update results display
    function updateResults(message, type = 'default') {
        resultsDiv.innerHTML = `<p class="${type}">${message}</p>`;
    }

    // Scan current page
    scanButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'scan'
            }, function(response) {
                if (response && response.results) {
                    updateResults(response.results);
                } else if (response && response.error) {
                    updateResults(response.error, 'error');
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
                content: content
            }, function(response) {
                if (response && response.assessment) {
                    updateResults(response.assessment);
                } else if (response && response.error) {
                    updateResults(response.error, 'error');
                }
            });
        }
    });
});

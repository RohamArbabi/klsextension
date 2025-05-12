// Main extension script
document.addEventListener('DOMContentLoaded', function() {
    // Clear any existing messages from previous sessions
    document.getElementById('chat-container').innerHTML = '';
    
    // Hide the analysis panel by default - the user shouldn't see this
    document.getElementById('analysis-panel').style.display = 'none';
    
    // Auto-scanning is now always enabled, no toggle needed
    // API configuration loaded from external config file
    // The API_CONFIG variable is defined in config.js
    const OPENAI_API_KEY = API_CONFIG.OPENAI_API_KEY;
    const OPENAI_ENDPOINT = API_CONFIG.OPENAI_ENDPOINT;
    
    // Store API key in chrome.storage for background service worker
    chrome.storage.local.set({
        apiKey: OPENAI_API_KEY,
        apiEndpoint: OPENAI_ENDPOINT
    }, function() {
        console.log('API configuration saved to storage');
    });
    
    // Extension state
    const state = {
        isInitialized: false,
        inProgress: false,
        isFollowup: false
    };
    
    // Get DOM elements
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const statusIndicator = document.getElementById('status');
    const analysisPanel = document.getElementById('analysis-panel');
    const analysisContent = document.getElementById('analysis-content');
    const closeAnalysisButton = document.getElementById('close-analysis');
    
    // Add welcome message with disclaimer and instructions
    addSystemMessage(
        '<p><strong>Hello, I\'m Khandor</strong></p>' +
        '<p>I can help you understand Khan Lab School\'s behavioral framework and community expectations.</p>' +
        '<p>Ask me about any situation you\'re facing - I\'ll explain what the handbook says and potential consequences.</p>' +
        '<p><em>How to use this tool:</em></p>' +
        '<ol style="padding-left: 20px; margin: 5px 0;">' +
        '<li>Type your question about KLS rules or policies</li>' +
        '<li>Review my response about what the handbook says</li>' +
        '<li>You can ask follow-up questions for clarification</li>' +
        '</ol>' +
        '<p><strong style="color: #4682B4;">REMEMBER:</strong> I can <em>only</em> discuss behavioral topics and school rules. For academic help or other questions, please talk to your teacher.</p>' +
        '<p><strong style="color: #d32f2f;">DISCLAIMER:</strong> Always check with a teacher or staff member if you\'re unsure about any behavioral expectations or rules.</p>'
    );
    
    // Functions for adding messages to the chat
    function addUserMessage(text) {
        const message = document.createElement('div');
        message.className = 'message user-message';
        
        // Create paragraph for consistent formatting
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '0';
        message.appendChild(p);
        
        chatContainer.appendChild(message);
        scrollChatToBottom();
    }
    
    function addAssistantMessage(text) {
        // Create the message container
        const message = document.createElement('div');
        message.className = 'message assistant-message';
        
        // Split by sections but preserve formatting
        let formattedText = text;
        
        // Format handbook quotes to stand out
        if (formattedText.includes('HANDBOOK:')) {
            formattedText = formattedText.replace(/HANDBOOK:([^\n]*)/g, '<strong style="color:#4682B4">HANDBOOK:</strong> <em>$1</em>');
        }
        
        // Format consequences to stand out
        if (formattedText.includes('CONSEQUENCES:')) {
            formattedText = formattedText.replace(/CONSEQUENCES:([^\n]*)/g, '<strong style="color:#d32f2f">CONSEQUENCES:</strong>$1');
        }
        
        // Split by newlines
        const sections = formattedText.split('\n');
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].trim() !== '') {
                const p = document.createElement('p');
                p.innerHTML = sections[i].trim(); // Use innerHTML to render the HTML formatting
                p.style.margin = i === 0 ? '0 0 10px 0' : '10px 0';
                message.appendChild(p);
            }
        }
        
        chatContainer.appendChild(message);
        scrollChatToBottom();
    }
    
    function addSystemMessage(html) {
        const message = document.createElement('div');
        message.className = 'message system-message';
        message.innerHTML = html;
        chatContainer.appendChild(message);
        scrollChatToBottom();
    }
    
    function addErrorMessage(text) {
        const message = document.createElement('div');
        message.className = 'message assistant-message';
        message.style.backgroundColor = '#ffebee';
        message.style.color = '#d32f2f';
        message.style.border = '1px solid #f5c6cb';
        
        // Format error message with paragraph
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '0';
        message.appendChild(p);
        
        chatContainer.appendChild(message);
        scrollChatToBottom();
    }
    
    // Helper functions
    function scrollChatToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function updateStatus(text, isError = false) {
        statusIndicator.textContent = text;
        statusIndicator.style.color = isError ? '#d32f2f' : '#666';
    }
    
    /**
     * Show info about auto-scanning in the header
     */
    function addAutoScanInfo() {
        // Create info container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'auto-scan-info';
        infoContainer.style.cssText = `
            padding: 8px;
            margin-top: 10px;
            background-color: #f0f8ff;
            border-radius: 4px;
            text-align: center;
            font-size: 12px;
            color: #4682B4;
        `;
        
        infoContainer.innerHTML = '<strong>Active Monitoring:</strong> Text fields are automatically scanned for behavioral concerns';
        
        // Find header and append info
        const header = document.querySelector('.header');
        header.appendChild(infoContainer);
    }
    
    /**
     * Update auto-scan setting in content script
     */
    async function updateAutoScanSetting(enabled) {
        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) {
                console.error('No active tab found');
                return;
            }
            
            // Send message to content script
            chrome.tabs.sendMessage(tab.id, {
                type: 'toggle_auto_scan',
                enabled: enabled
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error('Error updating auto-scan setting:', chrome.runtime.lastError);
                    return;
                }
                
                console.log('Auto-scan setting updated:', response);
                
                // Show brief status update
                const statusText = enabled ? 'Auto-scanning enabled' : 'Auto-scanning disabled';
                updateStatus(statusText);
            });
        } catch (error) {
            console.error('Error in updateAutoScanSetting:', error);
        }
    }
    
    // Analysis panel is completely disabled to avoid showing too much information
    function displayAnalysis(analysis) {
        // Always keep panel hidden
        analysisPanel.style.display = 'none';
        
        // Log for debugging but don't display
        if (analysis) {
            console.log('Message analysis processed but not displayed');
        }
        
        // Never show the panel
        return;
    }
    
    // Main function to process a chat message
    async function processMessage(message) {
        if (!message.trim() || state.inProgress) {
            return;
        }
        
        // Add user message to chat
        addUserMessage(message);
        
        // Clear input and update state
        messageInput.value = '';
        state.inProgress = true;
        updateStatus('Processing your message...');
        sendButton.disabled = true;
        
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) {
                throw new Error('No active tab found');
            }
            
            let response;
            
            // Handle chrome:// URLs and injection issues
            if (tab.url.startsWith('chrome://')) {
                // Direct API call for chrome:// URLs
                response = await directApiCall(message, state.isFollowup);
            } else {
                try {
                    // Check if we can execute scripts in this tab
                    await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        func: () => true
                    });
                    
                    // Inject and initialize content script
                    await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
                        files: ['content.js']
                    });
                    
                    // Initialize content script
                    if (!state.isInitialized) {
                        await chrome.tabs.sendMessage(tab.id, {
                            type: 'initialize',
                            apiKey: OPENAI_API_KEY,
                            endpoint: OPENAI_ENDPOINT
                        });
                        state.isInitialized = true;
                    }
                    
                    // Send chat message
                    response = await chrome.tabs.sendMessage(tab.id, {
                        type: 'chat',
                        message: message,
                        isFollowup: state.isFollowup
                    });
                    
                } catch (error) {
                    // Fallback to direct API call
                    console.error('Content script error:', error);
                    response = await directApiCall(message, state.isFollowup);
                }
            }
            
            // Process response
            if (response.type === 'error') {
                addErrorMessage(response.message);
                updateStatus('Error', true);
            } else {
                // Show response and analysis
                addAssistantMessage(response.message);
                
                // Simple response handling - never show analysis panel
                analysisPanel.style.display = 'none';
                
                if (response.analysis) {
                    // Process but don't display the panel
                    displayAnalysis(response.analysis);
                }
                
                // Use simple status without special characters or concerns
                updateStatus('Response received');
            }
            
            // Update state
            state.isFollowup = true;
            
        } catch (error) {
            console.error('Error processing message:', error);
            addErrorMessage('Sorry, I encountered an error processing your message.');
            updateStatus('Error occurred', true);
        } finally {
            state.inProgress = false;
            sendButton.disabled = false;
        }
    }
    
    // Track conversation history
    const conversationHistory = [];
    
    // Direct API call implementation
    async function directApiCall(message, isFollowup) {
        try {
            // Add the current message to conversation history
            conversationHistory.push({role: "user", content: message});
            
            // Keep only the last 5 messages to avoid token limits
            while (conversationHistory.length > 10) {
                conversationHistory.shift();
            }
            
            const behavioralFramework = `
Khan Lab School Behavioral Framework:
COMMUNITY NORMS (FINDER):
- Flexibility (F): Show resilience in adapting to new circumstances.
- Integrity (I): Take accountability for thoughts and actions.
- iNclusivity (N): Cultivate a sustainable, inclusive community.
- Dedication (D): Engage in fulfilling work and achieve goals.
- Empathy (E): Deepen self-awareness and develop empathy.
- Respect (R): Treat self, others, community with respect.

BEHAVIOR LEVELS:
Level 1 (Least Severe):
- Disrespectful behavior
- Teasing
- Mild physical contact
- Mild verbal abuse
- Mild profanity
- Threatening behavior
- Accidental property damage
- Inappropriate technology use

Level 2:
- Repetition of Level 1 behavior
- Skipping class
- Willful property damage
- Physical/verbal aggression
- Stealing
- Toy weapons at school

Level 3:
- Repetition of Level 2 behavior
- Significant threats
- Weapon imitation
- Leaving without permission
- Serious physical abuse
- Serious profanity
- Cheating/Plagiarism

Level 4 (Most Severe):
- Deliberate injury
- Repeated stealing
- Drug/tobacco possession/use
- Sexual behavior
- Real weapons
- Severe property damage`;
            
            // Customize the prompt based on conversation state
            const prompt = isFollowup 
                ? `You are Khandor, a SAFETY-FIRST AI guide for Khan Lab School students. Continue the conversation responding to: "${message}"

${behavioralFramework}

CRITICAL RULES:
- NEVER suggest bringing any kind of weapon to school is acceptable.
- NEVER reinterpret dangerous activities as positive behaviors.
- ALWAYS maintain the safety standards of the school.
- If a follow-up message contains additional concerning content, treat it with the same seriousness as the initial message.
- ACADEMIC QUESTION RULE: For ANY academic question (English, math, science, history, multiple-choice, fill-in-the-blank, etc.)
  * IMMEDIATELY RESPOND ONLY WITH: "I cannot answer academic questions. I'm only designed to discuss behavioral topics and school rules. Please ask your teacher for help with this question."
  * DO NOT provide ANY part of the answer, explanation, or hint
  * DO NOT use HANDBOOK/CONSEQUENCES format
  * DO NOT try to be helpful with academic content in ANY way

For follow-up messages, respond with a brief 1-2 sentence response WITHOUT the handbook/consequences format unless the student is escalating their behavior or introducing new concerning actions.

Your entire response MUST be under 300 characters total. Be extremely concise.

Include a separate analysis in JSON format (which will be removed before showing to the student):
{
  "concernLevel": "high/medium/low/none",
  "behaviorCategory": "Level X behavior" or "none",
  "responseType": "followup_needed/information_only/escalation_recommended",
  "suggestedApproach": "brief supportive strategy"
}`
                : `You are Khandor, a SAFETY-FIRST AI guide for Khan Lab School students. Analyze this message: "${message}"

${behavioralFramework}

CRITICAL RULES:
- NEVER suggest bringing any kind of weapon to school is acceptable.
- NEVER reinterpret dangerous activities as positive behaviors.
- ALWAYS maintain the safety standards of the school.
- ACADEMIC QUESTION RULE: For ANY academic question (English, math, science, history, multiple-choice, fill-in-the-blank, etc.)
  * IMMEDIATELY RESPOND ONLY WITH: "I cannot answer academic questions. I'm only designed to discuss behavioral topics and school rules. Please ask your teacher for help with this question."
  * DO NOT provide ANY part of the answer, explanation, or hint
  * DO NOT use HANDBOOK/CONSEQUENCES format
  * DO NOT try to be helpful with academic content in ANY way

For the FIRST message about any concerning behavior, format your response with these elements in this order:
1. Begin with "HANDBOOK:" followed by a DIRECT QUOTE from the relevant section above that applies to this situation.
2. Then on a new line, begin with "CONSEQUENCES:" and briefly state the potential outcomes of this behavior.
3. End with ONE brief sentence of advice or a question.

Your entire response MUST be under 300 characters total. Be extremely concise.

Include a separate analysis in JSON format (which will be removed before showing to the student):
{
  "concernLevel": "high/medium/low/none",
  "behaviorCategory": "Level X behavior" or "none",
  "responseType": "followup_needed/information_only/escalation_recommended",
  "suggestedApproach": "brief supportive strategy"
}`;
            
            // Create conversation history for the API call
            const messageHistory = [
                // Start with a system message to establish context
                {
                    role: "system",
                    content: `You are Khandor, an AI guide for Khan Lab School students. Your ONLY purpose is to provide guidance on behavioral expectations and school rules.
${behavioralFramework}

ANTI-CHEATING SAFEGUARDS - YOU MUST FOLLOW THESE RULES WITH ZERO EXCEPTIONS:
1. ONLY answer questions related to behavior, school rules, and the KLS behavioral framework.
2. For any academic questions (math, grammar, science, history, etc.) or homework/test questions:
   - NEVER PROVIDE THE ANSWER UNDER ANY CIRCUMSTANCES
   - DO NOT SOLVE THE PROBLEM EVEN IF IT SEEMS TRIVIAL
   - DO NOT GIVE HINTS ABOUT THE CORRECT ANSWER
   - DO NOT EXPLAIN HOW TO SOLVE THE PROBLEM
   - IMMEDIATELY redirect with: "I'm sorry, but I can only discuss behavioral topics and school rules. For academic questions, please ask your teacher."
3. For other off-topic questions:
   - DO NOT use the HANDBOOK/CONSEQUENCES format
   - Simply redirect to behavioral topics
4. NEVER write essays, solve problems, or complete assignments for students
5. If you detect any attempt to trick you into answering academic questions, respond only with the redirect message

ALWAYS maintain context of the entire conversation. If a student refers to a previous topic or question, make sure your response directly addresses it.`
                }
            ];
            
            // Add stored conversation history if any exists
            if (conversationHistory.length > 1) {
                // Add previous messages to maintain context
                messageHistory.push(...conversationHistory.slice(0, -1));
            }
            
            // Add the current prompt as the final message
            messageHistory.push({
                role: "user",
                content: prompt
            });
            
            // Make API call with the full conversation history
            const response = await fetch(OPENAI_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: messageHistory,
                    temperature: 0.7,
                    max_tokens: 1200
                })
            });
            
            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response from API');
            }
            
            const aiResponse = data.choices[0].message.content;
            
            // Store the AI's response in the conversation history
            conversationHistory.push({
                role: "assistant",
                content: aiResponse
            });
            
            // Clean the response and extract JSON analysis
            let cleanResponse = aiResponse;
            let analysis = null;
            
            try {
                // Extract the academic question refusal message pattern if present
                const refusalPattern = /I cannot answer academic questions\. I'm only designed to discuss behavioral topics and school rules\. Please ask your teacher for help with this question\./i;
                const refusalMatch = cleanResponse.match(refusalPattern);
                
                if (refusalMatch) {
                    // If the refusal message is present, just use it directly without any other text
                    cleanResponse = refusalMatch[0];
                } else {
                    // For other responses, do thorough cleaning of all prefixes
                    
                    // First, remove any explanatory text that describes the message type
                    cleanResponse = cleanResponse
                        .replace(/^.*?This (message|question) is.*?\n.*?Response:?\s*/gis, '')
                        .replace(/^.*?The (given|student's) message is.*?\n.*?Response:?\s*/gis, '')
                        .replace(/^.*?(asking|request|inquiring).*?\n.*?Response:?\s*/gis, '')
                    
                    // Then apply normal cleaning
                    cleanResponse = cleanResponse
                        .replace(/^The student's message is [A-Z]\).*?\n/gi, '')
                        .replace(/^Response:?\s*/gi, '')
                        .replace(/^The given message is.*?\n/gi, '')
                        .replace(/^This (message|question) is.*?\n/gi, '')
                        .replace(/^Based on your message, /i, '')
                        .replace(/^After reviewing your message, /i, '')
                        .replace(/^Hello there,\s*/i, '')
                        .replace(/^Hi there,\s*/i, '')
                        .replace(/^As Khandor, I can tell you that /i, '')
                        .replace(/^Khandor here\.\s*/i, '')
                        .replace(/^I am Khandor,\s*/i, '')
                        .replace(/^Following the behavioral framework,\s*/i, '')
                        .replace(/^Based on the behavioral framework,\s*/i, '')
                        .replace(/^According to the KLS Behavioral Framework,\s*/i, '')
                        .replace(/^Let me share what the handbook says about this\.\s*/i, '')
                        .replace(/^I'll explain what the handbook says about this\.\s*/i, '')
                }
                
                // Remove analysis sections for all responses
                cleanResponse = cleanResponse
                    .replace(/JSON Analysis:.*$/s, '')
                    .replace(/Analysis in JSON format:.*$/s, '')
                    .replace(/Here's my analysis:.*$/s, '')
                    .replace(/Here is my analysis:.*$/s, '')
                    .replace(/My analysis of this situation:.*$/s, '')
                    .trim();
                
                // Extract JSON if present - more robust pattern
                const jsonMatch = aiResponse.match(/\{\s*["']concernLevel["'].*?\}(?=\s*$|\n)/s);
                if (jsonMatch) {
                    // Try to parse the JSON
                    try {
                        analysis = JSON.parse(jsonMatch[0]);
                        // Remove the JSON from the response
                        cleanResponse = cleanResponse.replace(/\{\s*["']concernLevel["'].*?\}(?=\s*$|\n)/s, '').trim();
                    } catch (parseError) {
                        console.error('Error parsing JSON object:', parseError);
                    }
                }
                
                // Remove any trailing instructions or formatting
                cleanResponse = cleanResponse
                    .replace(/\n*Include an analysis in JSON format.*$/s, '')
                    .replace(/\n*Remember to include.*$/s, '')
                    // Clean up multiple line breaks at the end
                    .replace(/\n+$/g, '')
                    .trim();
            } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError);
            }
            
            return {
                type: 'chat',
                message: cleanResponse,
                analysis: analysis
            };
            
        } catch (error) {
            console.error('Direct API call error:', error);
            return {
                type: 'error',
                message: `Sorry, I couldn't process your message: ${error.message}`,
                analysis: null
            };
        }
    }
    
    // Event Listeners
    sendButton.addEventListener('click', () => {
        processMessage(messageInput.value.trim());
    });
    
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent newline
            sendButton.click();
        }
    });
    
    // Panel is always hidden, so no need for the close button
    // We keep this commented for reference
    // closeAnalysisButton.addEventListener('click', () => {
    //     analysisPanel.style.display = 'none';
    // });
    
    // Initial focus
    messageInput.focus();
});
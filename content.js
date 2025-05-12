// Check if we've already initialized to prevent duplicate declarations
if (typeof window.klsBehavioralAdvisor === 'undefined') {
    // Create a namespace to prevent global conflicts
    window.klsBehavioralAdvisor = (function() {
        // Private API configuration variables
        const state = {
            apiKey: null,
            apiEndpoint: null,
            isInitialized: false,
            chatHistory: [],
            textBoxMonitors: new Map(),  // Track text boxes we're monitoring
            scanDebounceTimer: null,  // Debounce timer for scanning
            lastScannedText: '',  // Track last scanned text to avoid duplicates
            scanInProgress: false  // Flag to prevent concurrent scans
        };
        
        /**
         * Process a message with the OpenAI API
         * @param {string} message - The message to process
         * @param {boolean} isFollowup - Whether this is a followup message in a conversation
         */
        async function processMessage(message, isFollowup = false) {
            console.log('Processing message:', message);
            
            if (!state.apiKey || !state.apiEndpoint) {
                return {
                    type: 'error',
                    message: 'API not initialized. Please try again.',
                    analysis: null
                };
            }

            // Add to chat history
            state.chatHistory.push({
                role: 'user',
                content: message
            });

            // Create the behavioral framework reference
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

            try {
                // Customize prompt based on conversation stage
                let prompt;
                
                if (!isFollowup) {
                    // Initial message prompt - direct and clear
                    prompt = `You are Khandor, a guide for Khan Lab School students. Analyze this message: "${message}"

${behavioralFramework}

IMPORTANT RULES FOR RESPONDING:

IF the question is about behavior or school rules:
1. Format your response with HANDBOOK: quote followed by CONSEQUENCES: explanation
2. Keep your response very brief (under 250 characters)

IF the question is academic (math, science, history, language, grammar, etc.):
- NEVER provide any academic answers, hints or explanations
- RESPOND ONLY WITH: "I cannot answer academic questions. I'm only designed to discuss behavioral topics and school rules. Please ask your teacher for help with this question."
- DO NOT be helpful with academic content in any way

IF the question is off-topic but not academic:
- Simply redirect to behavioral topics politely
- Do NOT use the HANDBOOK/CONSEQUENCES format for these

Include an analysis in JSON format at the end (which will be removed before showing the student):
{
  "concernLevel": "high/medium/low/none",
  "behaviorCategory": "Level X behavior" or "none",
  "responseType": "followup_needed/information_only/escalation_recommended",
  "suggestedApproach": "brief supportive strategy"
}`;
                } else {
                    // Follow-up conversation with context
                    const conversationHistory = state.chatHistory.map(msg => 
                        `${msg.role === 'user' ? 'Student' : 'Advisor'}: ${msg.content}`
                    ).join('\n\n');
                    
                    prompt = `You are Khandor, a guide for Khan Lab School students. Review this conversation history and respond to the latest message:

${behavioralFramework}

Conversation history:
${conversationHistory}

IMPORTANT RULES FOR RESPONDING:

IF the latest message is about behavior or school rules:
- Address their specific question about behavior or school rules
- If there are behavioral concerns, explore context and offer guidance

IF the latest message is academic (math, science, history, language, grammar, multiple-choice questions, etc.):
- NEVER provide any academic answers, hints or explanations
- RESPOND ONLY WITH: "I cannot answer academic questions. I'm only designed to discuss behavioral topics and school rules. Please ask your teacher for help with this question."
- DO NOT try to be helpful with academic content in any way

IF the latest message is off-topic but not academic:
- Simply redirect to behavioral topics politely

Include an analysis in JSON format at the end (which will be removed before showing the student):
{
  "concernLevel": "high/medium/low/none",
  "behaviorCategory": "Level X behavior" or "none",
  "responseType": "followup_needed/information_only/escalation_recommended",
  "suggestedApproach": "brief supportive strategy"
}`;
                }

                // Make OpenAI API call
                const response = await fetch(state.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4",
                        messages: [{
                            role: "user",
                            content: prompt
                        }],
                        temperature: 0.7,
                        max_tokens: 1200
                    })
                });

                const data = await response.json();
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    throw new Error('Invalid response from API');
                }
                
                const aiResponse = data.choices[0].message.content;
                
                // Add to chat history
                state.chatHistory.push({
                    role: 'assistant',
                    content: aiResponse
                });
                
                // Extract JSON analysis and clean response
                let analysis = null;
                let cleanResponse = aiResponse;
                
                try {
                    // Remove any debug/assistant remarks that might appear before the actual response
                    cleanResponse = cleanResponse
                        .replace(/^The student's message is [A-C]\).*?\n/i, '')
                        .replace(/^Response:\s*/i, '')
                        .replace(/JSON Analysis:.*$/s, '')
                        .trim();
                    
                    // Extract JSON if present
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        analysis = JSON.parse(jsonMatch[0]);
                        // Remove the JSON from the response
                        cleanResponse = cleanResponse.replace(/\{[\s\S]*\}/g, '').trim();
                    }
                } catch (jsonError) {
                    console.error('Error parsing JSON from response:', jsonError);
                }
                
                return {
                    type: 'chat',
                    message: cleanResponse,
                    analysis: analysis
                };
                
            } catch (error) {
                console.error('Error in message processing:', error);
                return {
                    type: 'error',
                    message: `I'm having trouble processing your message right now. Please try again.`,
                    analysis: null
                };
            }
        }

        /**
         * Analyze text for behavioral violations
         * @param {string} text - The text to analyze
         * @param {boolean} isAutoScan - Whether this is an automatic scan (vs. manual input)
         * @returns {Promise<object>} Analysis result
         */
        async function analyzeText(text, isAutoScan = false) {
            if (!text || text.trim().length < 1) {
                return null; // Only skip completely empty texts
            }
            
            if (text === state.lastScannedText && isAutoScan) {
                return null; // Skip duplicate scans for the same text
            }
            
            state.lastScannedText = text;
            
            try {
                const result = await processMessage(text, false);
                
                // Display warnings for any concerning content - including low level concerns
                if (result && result.analysis && 
                    (result.analysis.concernLevel === 'high' || 
                     result.analysis.concernLevel === 'medium' ||
                     result.analysis.concernLevel === 'low')) {
                    return result;
                }
                
                return null; // No concerns found
            } catch (error) {
                console.error('Error analyzing text:', error);
                return null;
            }
        }
        
        /**
         * Creates and shows a warning popup
         * @param {object} analysis - The analysis result
         * @param {string} text - The original text that was analyzed
         */
        function showWarningPopup(analysis, text) {
            if (!analysis || !analysis.analysis) return;
            
            // Remove any existing popups
            const existingPopup = document.getElementById('kls-warning-popup');
            if (existingPopup) {
                document.body.removeChild(existingPopup);
            }
            
            // Create popup container
            const popup = document.createElement('div');
            popup.id = 'kls-warning-popup';
            popup.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                background: white;
                border-left: 5px solid #d32f2f;
                border-radius: 4px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                font-family: 'Segoe UI', Tahoma, sans-serif;
                animation: kls-slide-in 0.3s ease-out;
            `;
            
            // Add animation style
            const style = document.createElement('style');
            style.textContent = `
                @keyframes kls-slide-in {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes kls-fade-out {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
            
            // Header
            const header = document.createElement('div');
            header.style.cssText = `
                background: #ffebee;
                padding: 12px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #ffcdd2;
            `;
            
            const title = document.createElement('h3');
            title.textContent = '⚠️ Behavioral Warning';
            title.style.cssText = `
                margin: 0;
                font-size: 16px;
                color: #d32f2f;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            `;
            closeBtn.onclick = () => {
                popup.style.animation = 'kls-fade-out 0.3s';
                setTimeout(() => {
                    if (popup.parentNode) {
                        document.body.removeChild(popup);
                    }
                }, 280);
            };
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            // Content
            const content = document.createElement('div');
            content.style.padding = '15px';
            
            // Concern level badge
            const concernLevel = analysis.analysis.concernLevel || 'medium';
            const levelColors = {
                high: '#d32f2f',
                medium: '#ff9800',
                low: '#4caf50',
                none: '#757575'
            };
            
            const levelBadge = document.createElement('div');
            levelBadge.style.cssText = `
                display: inline-block;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                color: white;
                background-color: ${levelColors[concernLevel] || levelColors.medium};
                margin-bottom: 10px;
            `;
            levelBadge.textContent = `${concernLevel.toUpperCase()} CONCERN`;
            
            // Violated norm
            const norm = document.createElement('div');
            norm.style.cssText = `
                margin-bottom: 15px;
                font-size: 14px;
            `;
            
            // Get behavior category from analysis
            const behaviorCategory = analysis.analysis.behaviorCategory || 'Unknown behavior';
            norm.innerHTML = `<strong>Handbook Violation:</strong> ${behaviorCategory}`;
            
            // Excerpted text that triggered the warning
            const excerpt = document.createElement('div');
            excerpt.style.cssText = `
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
                font-size: 13px;
                border-left: 3px solid #ccc;
                max-height: 80px;
                overflow-y: auto;
            `;
            
            // Highlight the analyzed message
            excerpt.textContent = text;
            
            // Proceed button
            const proceedBtn = document.createElement('button');
            proceedBtn.textContent = 'Proceed with Caution';
            proceedBtn.style.cssText = `
                background-color: #ff9800;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                width: 100%;
            `;
            proceedBtn.onclick = () => {
                popup.style.animation = 'kls-fade-out 0.3s';
                setTimeout(() => {
                    if (popup.parentNode) {
                        document.body.removeChild(popup);
                    }
                }, 280);
            };
            
            // Assemble content
            content.appendChild(levelBadge);
            content.appendChild(norm);
            content.appendChild(excerpt);
            content.appendChild(proceedBtn);
            
            // Assemble popup
            popup.appendChild(header);
            popup.appendChild(content);
            
            // Add to document
            document.body.appendChild(popup);
            
            // Auto-close after 15 seconds
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.style.animation = 'kls-fade-out 0.3s';
                    setTimeout(() => {
                        if (popup.parentNode) {
                            document.body.removeChild(popup);
                        }
                    }, 280);
                }
            }, 15000);
        }
        
        /**
         * Monitor a text input field for content changes
         * @param {HTMLElement} element - The text input element to monitor
         */
        function monitorTextInput(element) {
            if (!element || state.textBoxMonitors.has(element)) {
                return; // Already monitoring this element
            }
            
            // Function to handle input changes
            const handleInput = async () => {
                if (state.scanInProgress) return;
                
                // Minimal debounce to prevent API spam while being as responsive as possible
                clearTimeout(state.scanDebounceTimer);
                
                state.scanDebounceTimer = setTimeout(async () => {
                    const text = element.value || element.textContent || '';
                    
                    // No minimum character limit
                    if (text.trim().length > 0) {
                        state.scanInProgress = true;
                        const result = await analyzeText(text, true);
                        state.scanInProgress = false;
                        
                        if (result) {
                            showWarningPopup(result, text);
                        }
                    }
                }, 300); // Very short delay for responsiveness
            };
            
            // Add event listeners for various input events
            element.addEventListener('input', handleInput);
            element.addEventListener('change', handleInput);
            
            // Store reference to event handler for cleanup
            state.textBoxMonitors.set(element, handleInput);
        }
        
        /**
         * Scan the page for text input fields to monitor
         */
        function scanPageForTextInputs() {
            // Query for common text input elements
            const textInputs = [
                ...document.querySelectorAll('textarea'),
                ...document.querySelectorAll('input[type="text"]'),
                ...document.querySelectorAll('[contenteditable="true"]'),
                ...document.querySelectorAll('[role="textbox"]')
            ];
            
            // Start monitoring each text input
            textInputs.forEach(input => {
                monitorTextInput(input);
            });
            
            console.log(`KLS Advisor: Monitoring ${textInputs.length} text inputs`);
        }
        
        /**
         * Initialize automatic scanning of text inputs
         */
        function initAutoScan() {
            if (!state.isInitialized) return;
            
            console.log('KLS Advisor: Initializing automatic text scanning');
            
            // Scan for existing text inputs
            scanPageForTextInputs();
            
            // Set up mutation observer to detect new text inputs
            const observer = new MutationObserver((mutations) => {
                let shouldRescan = false;
                
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        shouldRescan = true;
                    }
                });
                
                if (shouldRescan) {
                    scanPageForTextInputs();
                }
            });
            
            // Start observing the document with the configured parameters
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Message handler setup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);
            
            // Handle initialization
            if (message.type === 'initialize') {
                if (!state.isInitialized) {
                    state.apiKey = message.apiKey;
                    state.apiEndpoint = message.endpoint;
                    state.isInitialized = true;
                    console.log('API initialized successfully');
                    
                    // Initialize automatic scanning
                    setTimeout(initAutoScan, 1000); // Slight delay to ensure page is loaded
                }
                sendResponse({status: 'initialized'});
                return true;
            }
            
            // Auto-scan feature is always enabled, no toggle needed
            
            // Handle chat message
            if (message.type === 'chat') {
                if (!message.message) {
                    sendResponse({
                        type: 'error',
                        message: 'Please enter a message to continue.',
                        analysis: null
                    });
                    return true;
                }
                
                // Process message
                processMessage(message.message, message.isFollowup)
                    .then(result => {
                        console.log('Chat result:', result);
                        sendResponse(result);
                    })
                    .catch(error => {
                        console.error('Error in chat processing:', error);
                        sendResponse({
                            type: 'error',
                            message: `Sorry, I encountered an error: ${error.message}`,
                            analysis: null
                        });
                    });
                
                return true; // Required for async response
            }
            
            // Reset chat history
            if (message.type === 'reset_chat') {
                state.chatHistory = [];
                sendResponse({status: 'chat_reset'});
                return true;
            }
            
            return false;
        });
        
        // Public API for extension pages (empty to prevent external manipulation)
        return {};
    })();
    
    console.log('Khandor initialized');
} else {
    console.log('Khandor already initialized');
}

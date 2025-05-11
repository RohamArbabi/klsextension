// Check if we've already initialized to prevent duplicate declarations
if (typeof window.klsBehavioralAdvisor === 'undefined') {
    // Create a namespace to prevent global conflicts
    window.klsBehavioralAdvisor = (function() {
        // Private API configuration variables
        const state = {
            apiKey: null,
            apiEndpoint: null,
            isInitialized: false,
            chatHistory: []
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
                }
                sendResponse({status: 'initialized'});
                return true;
            }
            
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
        
        // Public API (empty to prevent external manipulation)
        return {};
    })();
    
    console.log('Khandor initialized');
} else {
    console.log('Khandor already initialized');
}

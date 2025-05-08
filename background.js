// Load environment variables
const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Check if API key is set
if (!API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
}

// Local code of conduct
const CODE_OF_CONDUCT = `1. No hate speech or discrimination
2. No illegal activities
3. No explicit sexual content
4. No harassment or bullying
5. No promotion of violence
6. No misinformation or fake news
7. No unauthorized sharing of personal information`;

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.type) {
            case 'check':
                const assessment = checkContentAgainstConduct(request.content);
                assessment.then(result => sendResponse({ assessment: result })).catch(error => sendResponse({ error: error.message }));
                break;
            case 'scan':
                const scanResult = scanPageContent();
                scanResult.then(result => sendResponse({ results: result })).catch(error => sendResponse({ error: error.message }));
                break;
        }
    } catch (error) {
        console.error('Error:', error);
        sendResponse({ error: error.message });
    }
    return true;
});

// Check content against code of conduct
async function checkContentAgainstConduct(content) {
    const prompt = `You are a strict content conduct checker. Analyze the following content against our code of conduct and provide a clear assessment:

Content: ${content}

Code of Conduct:
${CODE_OF_CONDUCT}

Please respond with:
- A clear assessment ("Pass" or "Fail")
- Specific violations if any
- A brief explanation of why it passed or failed

Respond in this format:
Assessment: [Pass/Fail]
Violations: [List of violations if any]
Explanation: [Brief explanation]`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error in generateChatResponse:', error);
        throw error;
    }
}

// Check content against code of conduct
async function checkContentAgainstConduct(content, codeOfConduct) {
    const prompt = `Analyze the following content against the code of conduct:
    
    Code of Conduct:
    ${codeOfConduct}
    
    Content to check:
    ${content}
    
    Provide a detailed assessment of whether this content complies with the code of conduct. Include specific reasons for any violations.`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error in checkContentAgainstConduct:', error);
        throw error;
    }
}

// Scan page content
async function scanPageContent(codeOfConduct, content) {
    const prompt = `Analyze the following webpage content against the code of conduct:
    
    Code of Conduct:
    ${codeOfConduct}
    
    Webpage content:
    ${content}
    
    Provide a detailed assessment of any potential violations and their locations.`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 400
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error in scanPageContent:', error);
        throw error;
    }
}

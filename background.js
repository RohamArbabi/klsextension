// Replace with your actual OpenAI API key
const API_KEY = 'YOUR_API_KEY_HERE';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.type) {
            case 'chat':
                const response = generateChatResponse(request.message, request.codeOfConduct);
                response.then(result => sendResponse({ message: result })).catch(error => sendResponse({ error: error.message }));
                break;
            case 'check':
                const assessment = checkContentAgainstConduct(request.content, request.codeOfConduct);
                assessment.then(result => sendResponse({ assessment: result })).catch(error => sendResponse({ error: error.message }));
                break;
            case 'scan':
                const scanResult = scanPageContent(request.codeOfConduct, request.content);
                scanResult.then(result => sendResponse({ results: result })).catch(error => sendResponse({ error: error.message }));
                break;
        }
    } catch (error) {
        console.error('Error:', error);
        sendResponse({ error: error.message });
    }
    return true;
});

// Generate chat response
async function generateChatResponse(message, codeOfConduct) {
    const prompt = `You are a content conduct checker. 
    Code of Conduct:
    ${codeOfConduct}
    
    User: ${message}
    Assistant:`;

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
                temperature: 0.7,
                max_tokens: 200
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

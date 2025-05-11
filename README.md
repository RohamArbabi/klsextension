# What Would Khandor Do? - KLS Behavioral Guidance Extension

This Chrome extension helps students verify if their actions and messages align with Khan Lab School's Behavioral Intervention Framework by allowing them to consult with Khandor, a virtual behavioral guide.

## Features

- Chat interface with Khandor for behavioral guidance
- Strict anti-cheating measures - no academic help provided
- Responses based on Khan Lab School's Behavioral Framework
- Conversation history to maintain context
- Beautiful, user-friendly interface designed for young students

## Installation for Development

1. Clone this repository
2. Create a `config.js` file in the root directory using the example below
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension directory

### API Key Configuration

Copy `config.example.js` to `config.js` and add your OpenAI API key:

```javascript
// This file contains sensitive information and should not be committed to Git
// It's included in .gitignore

const API_CONFIG = {
    OPENAI_API_KEY: 'your_openai_api_key_here',
    OPENAI_ENDPOINT: 'https://api.openai.com/v1/chat/completions'
};
```

## Usage

1. Click the extension icon to open the popup
2. Type your message in the input box to ask Khandor about behavioral guidance
3. Khandor will respond with advice based on the Khan Lab School Behavioral Framework
4. For behavior-related questions, Khandor will provide specific handbook references and consequences
5. For academic questions, Khandor will politely redirect you to your teacher

## Production Distribution

When publishing the extension to the Chrome Web Store:

1. Include your real `config.js` file with the actual API key in the package
2. Since the extension is distributed privately through the Chrome Web Store, the API key will remain secure
3. This approach allows the extension to work immediately on any device it's installed on

## Security Notes

- The API key is stored securely in the private extension package
- The extension strictly enforces anti-cheating measures
- All API calls are made securely with proper authentication

## Note

Make sure to replace the placeholder API key with your actual OpenAI API key before using the extension.

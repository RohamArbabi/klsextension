# Content Conduct Checker Chrome Extension

This Chrome extension uses an LLM to scan websites and check content against a customizable code of conduct.

## Features

- Website content scanning for code of conduct violations
- Chat interface with LLM for content analysis
- Content checking before sending
- Customizable code of conduct
- Persistent storage for code of conduct

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Replace `YOUR_API_KEY_HERE` in `background.js` with your OpenAI API key

## Usage

1. Click the extension icon to open the popup
2. Enter your code of conduct in the text area
3. Use the following features:
   - Chat with the LLM about content concerns
   - Scan the current page for violations
   - Check specific content before sending

## Note

Make sure to replace the placeholder API key with your actual OpenAI API key before using the extension.

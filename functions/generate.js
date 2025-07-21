const { GoogleGenAI, Type } = require("@google/genai");

/**
 * Recursively traverses a JSON schema and replaces string representations of 'type'
 * with the corresponding enum values from the GoogleGenAI SDK.
 * This is necessary because the schema comes from a client-side JSON object.
 * @param {object} schemaPart - The part of the schema to process.
 */
function convertSchemaTypes(schemaPart) {
  if (!schemaPart) {
    return;
  }

  // Replace string type with enum if it exists in the SDK's Type enum
  if (schemaPart.type && typeof schemaPart.type === 'string' && Type[schemaPart.type]) {
    schemaPart.type = Type[schemaPart.type];
  }

  // Recurse for nested properties
  if (schemaPart.properties) {
    for (const key in schemaPart.properties) {
      convertSchemaTypes(schemaPart.properties[key]);
    }
  }

  // Recurse for array items
  if (schemaPart.items) {
    convertSchemaTypes(schemaPart.items);
  }
}


exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, config } = JSON.parse(event.body);

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    
    if (!process.env.API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on server' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const generationRequest = {
        model: 'gemini-2.5-flash',
        contents: prompt,
    };

    if (config) {
        if (config.responseSchema) {
            convertSchemaTypes(config.responseSchema);
        }
        generationRequest.config = config;
    }
    
    const response = await ai.models.generateContent(generationRequest);
    
    const text = response.text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    };

  } catch (error) {
    console.error('Error in serverless function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to generate AI content' })
    };
  }
};
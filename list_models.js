const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        // Note: older SDKs might not expose listModels directly on genAI.
        // Accessing via the model manager if possible, or usually we just inspect known models.
        // The SDK actually doesn't make listing models super easy in strict typing without looking at the manager.
        // Let's rely on a raw fetch if SDK doesn't support it easily in this version, 
        // BUT usually getting a model definition works.
        // Actually, for v1beta, the standard REST endpoint is easy to hit.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Error listing models:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Script Error:", error);
    }
}

listModels();

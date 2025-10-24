import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schemaResponseSchema = {
  type: Type.OBJECT,
  properties: {
    justification: {
      type: Type.STRING,
      description: "A high-level overview and justification for the overall schema design, explaining the choices made.",
    },
    schema: {
      type: Type.OBJECT,
      properties: {
        collections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the collection, typically plural." },
              description: { type: Type.STRING, description: "A one-sentence explanation for why this collection is needed." },
              relevantRequirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of exact string quotes from the user's requirements that justify the existence of this collection.",
              },
              fields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "The name of the field, in camelCase." },
                    type: { type: Type.STRING, description: "The data type of the field (e.g., String, Number, Boolean, ObjectID, Array<ObjectID>, Date)." },
                    description: { type: Type.STRING, description: "A one-sentence explanation for why this field is needed." },
                    relevantRequirements: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "An array of exact string quotes from the user's requirements that justify the existence of this field.",
                    },
                  },
                  required: ["name", "type", "description", "relevantRequirements"],
                },
              },
            },
            required: ["name", "description", "relevantRequirements", "fields"],
          },
        },
      },
      required: ["collections"],
    },
  },
  required: ["justification", "schema"],
};

export async function generateSchemaFromRequirements(requirements: string): Promise<GeminiResponse> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Based on the following application requirements, generate a minimalist NoSQL database schema. For every collection and field, provide a short justification and list the exact requirement sentences that necessitate it.

Requirements:
---
${requirements}
---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schemaResponseSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text.trim();
    const parsedResponse = JSON.parse(jsonString);

    return parsedResponse as GeminiResponse;
  } catch (error) {
    console.error("Error generating schema:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate schema: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the schema.");
  }
}

export async function runRobustnessTest(requirements: string): Promise<GeminiResponse[]> {
  const temperatures = [0.5, 0.6, 0.7, 0.8, 0.9];
  
  try {
    const promises = temperatures.map(temp => {
      return ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `Based on the following application requirements, generate a minimalist NoSQL database schema. For every collection and field, provide a short justification and list the exact requirement sentences that necessitate it.

Requirements:
---
${requirements}
---`,
        config: {
          responseMimeType: "application/json",
          responseSchema: schemaResponseSchema,
          temperature: temp,
        },
      });
    });

    const responses = await Promise.all(promises);

    const parsedResponses = responses.map(response => {
        const jsonString = response.text.trim();
        // Handle potential empty or invalid JSON strings from the API
        if (!jsonString) {
          throw new Error("Received an empty response from the API.");
        }
        return JSON.parse(jsonString) as GeminiResponse;
    });

    return parsedResponses;

  } catch (error) {
    console.error("Error running robustness test:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to run robustness test: ${error.message}`);
    }
    throw new Error("An unknown error occurred while running the robustness test.");
  }
}

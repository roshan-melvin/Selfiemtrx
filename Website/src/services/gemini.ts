import { GoogleGenerativeAI } from "@google/generative-ai";

// Make sure your API key is properly set
const API_KEY = "AIzaSyBoAPEKSmkMuHya6B1QGaz020kfY1K8U8s"; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GeminiResponse {
  text: string;
  isLoading: boolean;
}

export async function getGeminiResponse(prompt: string, imageData?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (imageData) {
      const imageBase64 = imageData.split(',')[1];
      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg"
          }
        }
      ];

      // Updated prompt to be more explicit about allowing other objects including animals
      const detectionPrompt = `Count ONLY the number of human persons in this image. 
        - Do not count mannequins, images of people, or statues
        - Animals, pets, furniture, or any other objects should not be included in this count
        - Respond with ONLY a number
        - If you can't determine the count, respond with '0'`;
      
      const detectionResult = await model.generateContent([detectionPrompt, ...imageParts]);
      const detectionResponse = await detectionResult.response;
      const peopleCount = parseInt(detectionResponse.text().trim());

      // Only proceed if exactly one person is detected
      if (peopleCount !== 1) {
        return "Cannot process selfies/images with more than one person";
      }

      // If exactly one person is detected, proceed with normal analysis regardless of other objects
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      return response.text();
    } else {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error('Error getting Gemini response:', error);
    throw error;
  }
}

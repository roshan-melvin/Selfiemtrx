import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("your-api-key");

export async function getGeminiResponse(imageData: string, prompt: string): Promise<string> {
  try {
    // Ensure imageData is properly formatted (should be base64 without the prefix)
    const formattedImageData = imageData.startsWith('data:image') 
      ? imageData 
      : `data:image/jpeg;base64,${imageData}`;
    
    // Create a more specific prompt for facial analysis
    const facialAnalysisPrompt = `
      Analyze the facial features in this image. Please describe:
      1. Face shape (oval, round, square, etc.)
      2. Eye shape and color
      3. Nose characteristics
      4. Lip shape and fullness
      5. Jawline definition
      6. Any distinctive features
      7. Overall facial symmetry and proportions
      
      Additional prompt: ${prompt}
    `;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyDJC5a7hDlC-rRIWB9Oeojy4nYDMWNMN_Y', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: facialAnalysisPrompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: formattedImageData.split(',')[1] // Extract base64 data without the prefix
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return `Error: ${data.error.message || 'Failed to analyze image'}`;
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error in getGeminiResponse:', error);
    return 'Sorry, I encountered an error analyzing the image. Please try again.';
  }
}

function Upload() {
  const navigate = useNavigate();

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const imageData = e.target.result as string;
        setSelectedImage(imageData);  // For preview

        try {
          const analysis = await getGeminiResponse(
            imageData,
            "Please analyze this image and provide detailed feedback."
          );
          setAnalysisResult(analysis);
        } catch (error) {
          setError('Failed to analyze image');
          console.error(error);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAskAboutResults = async () => {
    if (!selectedImage) {
      setError('Please upload an image first');
      return;
    }

    try {
      // Get the image data from the selectedImage
      const imageElement = document.getElementById('uploadedImage') as HTMLImageElement;
      
      if (!imageElement) {
        setError('Image not found');
        return;
      }
      
      // Get the image data directly from the src attribute
      const imageData = imageElement.src;
      
      // Show loading state
      const aiResultElement = document.getElementById('aiAnalysisResult');
      if (aiResultElement) {
        aiResultElement.innerHTML = '<div class="animate-pulse">Analyzing facial features...</div>';
      }
      
      // Call Gemini with the image data and a prompt focused on facial analysis
      const response = await getGeminiResponse(
        imageData, 
        'Please focus on facial features and provide a detailed analysis.'
      );
      
      // Display the response
      if (aiResultElement) {
        aiResultElement.innerHTML = `<div class="prose prose-invert max-w-none">${response}</div>`;
      }
    } catch (error) {
      console.error('Error in handleAskAboutResults:', error);
      setError('Failed to analyze image');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
      >
        <ArrowLeft size={20} />
        Back to Home
      </button>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Upload Your Image</h1>
        <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-gray-700">
          <p className="text-xl mb-8">Upload page content will go here</p>
        </div>
      </div>
    </div>
  );
}

export default Upload;
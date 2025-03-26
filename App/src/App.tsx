import GoogleSignIn from './components/GoogleSignIn';

const simulateUpload = async (imageData: string) => {
  // ... existing code ...

  try {
    // Update user stats first
    const updatedStats = await updateUserStats(user.uid);
    setUserStats(updatedStats);

    // Fix the type error by ensuring prompt and selectedImage are strings
    const response = await getGeminiResponse(prompt.toString(), selectedImage || '');
    setResults(response);
  } catch (error) {
    console.error('Error analyzing:', error);
  }
};

// Fix the analysisResult error property check
if (selectedModel === 'free' && analysisResult?.error) {
  return (
    <div className="mt-8 p-6 bg-red-500/10 rounded-lg border border-red-500/50">
      <div className="flex items-start gap-3">
        // ... existing code ...
      </div>
    </div>
  );
}

// Fix the null checks for analysisResult
{analysisResult?.detected_objects && (
  <>
    <div className="p-4 bg-white/5 rounded-lg">
      <p className="text-gray-400 mb-1">Number of Persons Detected</p>
      <p className="text-2xl font-bold">
        {analysisResult.detected_objects.filter((obj) => obj.object_name === 'person').length}
      </p>
    </div>
    <div className="p-4 bg-white/5 rounded-lg">
      <p className="text-gray-400 mb-1">Number of Objects Detected</p>
      <p className="text-2xl font-bold">
        {analysisResult.detected_objects.filter((obj) => obj.object_name !== 'person').length}
      </p>
    </div>
    <div className="p-4 bg-white/5 rounded-lg">
      <p className="text-gray-400 mb-1">Detected Objects</p>
      <div className="space-y-2">
        {analysisResult.detected_objects.map((obj, index) => (
          // ... existing code ...
        ))}
      </div>
    </div>
  </>
)}

// Fix the navigation type error
const handleAuthenticatedNavigation = (view: 'upload' | 'camera' | 'bmi-calculator') => {
  if (!user) {
    setShowLogin(true);
    return;
  }
  setCurrentView(view);
}; 
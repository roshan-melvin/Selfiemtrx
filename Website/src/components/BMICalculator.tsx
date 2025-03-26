import React, { useState } from 'react';
import { ArrowLeft, Ruler, Activity, Heart, Scale, ChevronRight } from 'lucide-react';
import { getBMIAnalysis } from '../services/gemini';

// Add BMI ranges constant
export const BMI_RANGES = {
  height: { min: 45, max: 250 },  // cm (covers from ~1 year old to tallest adults)
  weight: { min: 8, max: 300 },   // kg (covers from ~1 year old to heavy adults)
  age: { min: 1, max: 120 }       // years (full human lifespan)
};

// BMI Categories for visual representation
const BMI_CATEGORIES = [
  { range: 'Underweight', min: 0, max: 18.5, color: 'from-blue-400 to-blue-500' },
  { range: 'Normal', min: 18.5, max: 24.9, color: 'from-green-400 to-green-500' },
  { range: 'Overweight', min: 25, max: 29.9, color: 'from-yellow-400 to-yellow-500' },
  { range: 'Obese', min: 30, max: 100, color: 'from-red-400 to-red-500' }
];

interface BMICalculatorProps {
  onBack: () => void;
}

const BMICalculator: React.FC<BMICalculatorProps> = ({ onBack }) => {
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [bmiResult, setBmiResult] = useState<string>('');
  const [bmiAnalysis, setBmiAnalysis] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [warningShown, setWarningShown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [heightError, setHeightError] = useState<string>('');
  const [weightError, setWeightError] = useState<string>('');
  const [ageError, setAgeError] = useState<string>('');

  // Get BMI category and color
  const getBMICategory = (bmi: number) => {
    if (bmi >= 30) return BMI_CATEGORIES[3]; // Obese
    return BMI_CATEGORIES.find(cat => bmi >= cat.min && bmi < cat.max) || BMI_CATEGORIES[3];
  };

  const calculateBMI = async () => {
    // Check if any field is empty
    if (!height || !weight || !age) {
      if (!warningShown) {
        setError('Please fill in all fields');
        setWarningShown(true);
      }
      return;
    }

    // Parse values
    const heightValue = parseFloat(height);
    const weightValue = parseFloat(weight);
    const ageValue = parseInt(age);

    // Validate ranges
    if (isNaN(heightValue) || isNaN(weightValue) || isNaN(ageValue)) {
      setError('Please enter valid numbers');
      return;
    }

    // Check each value against its range
    if (heightValue < BMI_RANGES.height.min || heightValue > BMI_RANGES.height.max) {
      setError(`Height must be between ${BMI_RANGES.height.min} and ${BMI_RANGES.height.max} cm`);
      return;
    }

    if (weightValue < BMI_RANGES.weight.min || weightValue > BMI_RANGES.weight.max) {
      setError(`Weight must be between ${BMI_RANGES.weight.min} and ${BMI_RANGES.weight.max} kg`);
      return;
    }

    if (ageValue < BMI_RANGES.age.min || ageValue > BMI_RANGES.age.max) {
      setError(`Age must be between ${BMI_RANGES.age.min} and ${BMI_RANGES.age.max} years`);
      return;
    }

    // Clear the error if all validations pass
    setError(null);
    setWarningShown(false);
    
    const heightInMeters = heightValue / 100;
    const bmi = weightValue / (heightInMeters * heightInMeters);
    setBmiResult(bmi.toFixed(2));
    
    // Get AI analysis
    try {
      setIsLoading(true);
      const prompt = `Provide a brief BMI analysis for:
BMI: ${bmi.toFixed(2)}
Height: ${height} cm
Weight: ${weight} kg
Age: ${age} years

Please format your response with these sections:

**BMI Category**
[1-2 lines about their BMI classification]

**Health Status**
[2-3 lines about current health implications]

**Quick Tips**

• Key lifestyle recommendation: [Your recommendation]
• Nutrition advice: [Your recommendation]
• Exercise suggestion: [Your recommendation]

Keep each section brief and focused on actionable insights.`;
      
      const response = await getBMIAnalysis(prompt);
      setBmiAnalysis(response);
    } catch (error) {
      console.error('Error getting BMI analysis:', error);
      setError('Failed to get AI analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Background"
          className="w-full h-full object-cover blur-2xl opacity-30"
        />
      </div>

      {/* Background gradient and decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0A0F1C]/90 to-black"></div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t border-l border-blue-500/10 rounded-tl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b border-r border-purple-500/10 rounded-br-3xl"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-4 md:p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Activity size={32} className="text-blue-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#ADA1F5]">BMI Calculator & Analysis</h1>
          </div>

          {/* Main Grid: Input and Results */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Input Section */}
            <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Scale size={20} className="text-blue-400" />
                Enter Your Details
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Height Input */}
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-300 mb-2">
                    Height (cm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="height"
                      value={height}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setHeight(e.target.value);
                        if (value < BMI_RANGES.height.min || value > BMI_RANGES.height.max) {
                          setHeightError(`Height must be between ${BMI_RANGES.height.min} and ${BMI_RANGES.height.max} cm`);
                        } else {
                          setHeightError('');
                        }
                        if (warningShown) setError(null);
                      }}
                      className="w-full px-4 py-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder={`${BMI_RANGES.height.min}-${BMI_RANGES.height.max}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      cm
                    </div>
                  </div>
                  {heightError && (
                    <p className="mt-2 text-sm text-red-400">{heightError}</p>
                  )}
                </div>

                {/* Weight Input */}
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-300 mb-2">
                    Weight (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="weight"
                      value={weight}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setWeight(e.target.value);
                        if (value < BMI_RANGES.weight.min || value > BMI_RANGES.weight.max) {
                          setWeightError(`Weight must be between ${BMI_RANGES.weight.min} and ${BMI_RANGES.weight.max} kg`);
                        } else {
                          setWeightError('');
                        }
                        if (warningShown) setError(null);
                      }}
                      className="w-full px-4 py-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder={`${BMI_RANGES.weight.min}-${BMI_RANGES.weight.max}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      kg
                    </div>
                  </div>
                  {weightError && (
                    <p className="mt-2 text-sm text-red-400">{weightError}</p>
                  )}
                </div>

                {/* Age Input */}
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-2">
                    Age (years)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="age"
                      value={age}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setAge(e.target.value);
                        if (value < BMI_RANGES.age.min || value > BMI_RANGES.age.max) {
                          setAgeError(`Age must be between ${BMI_RANGES.age.min} and ${BMI_RANGES.age.max} years`);
                        } else {
                          setAgeError('');
                        }
                        if (warningShown) setError(null);
                      }}
                      className="w-full px-4 py-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder={`${BMI_RANGES.age.min}-${BMI_RANGES.age.max}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      yrs
                    </div>
                  </div>
                  {ageError && (
                    <p className="mt-2 text-sm text-red-400">{ageError}</p>
                  )}
                </div>

                {/* Calculate Button */}
                <button
                  onClick={calculateBMI}
                  disabled={isLoading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={20} />
                      Calculate & Analyze
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Heart size={20} className="text-blue-400" />
                Your Results
              </h2>

              {!bmiResult ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-center p-8">
                  <p>Enter your details and click calculate to see your BMI analysis</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* BMI Score */}
                  <div className="p-6 bg-gradient-to-r from-[#6EA2FF]/10 via-[#B988FF]/10 to-[#FF93F4]/10 rounded-xl border border-[#B988FF]/20">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-200">{bmiResult}</span>
                      <span className="text-gray-400">BMI</span>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                          className={`h-full bg-gradient-to-r ${getBMICategory(parseFloat(bmiResult)).color}`}
                          style={{ width: `${Math.min((parseFloat(bmiResult) / 40) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        {getBMICategory(parseFloat(bmiResult)).range}
                      </div>
                    </div>
                  </div>

                  {/* BMI Categories */}
                  <div className="grid grid-cols-2 gap-3">
                    {BMI_CATEGORIES.map((category, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg text-sm ${
                          getBMICategory(parseFloat(bmiResult)).range === category.range
                            ? 'bg-gradient-to-r ' + category.color + ' text-white'
                            : 'bg-white/5 text-gray-400'
                        }`}
                      >
                        {category.range}
                        <div className="text-xs opacity-75">
                          {category.min} - {category.max}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis Section */}
          {bmiResult && (
            <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                Detailed Analysis
                {isLoading && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    AI is analyzing your results...
                  </div>
                )}
              </h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="space-y-4 text-center">
                    <div className="inline-block">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                    </div>
                    <p className="text-gray-400">Processing your health analysis...</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-4">
                  {/* BMI Category Section */}
                  <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2">BMI Category</h4>
                    <p className="text-gray-200 leading-relaxed">
                      {bmiAnalysis.split('**BMI Category**')[1]?.split('**Health Status**')[0]?.trim()}
                    </p>
                  </div>

                  {/* Health Status Section */}
                  <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2">Health Status</h4>
                    <p className="text-gray-200 leading-relaxed">
                      {bmiAnalysis.split('**Health Status**')[1]?.split('**Quick Tips**')[0]?.trim()}
                    </p>
                  </div>

                  {/* Quick Tips Section */}
                  <div className="flex-1 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2">Quick Tips</h4>
                    <div className="space-y-3 text-gray-200">
                      {bmiAnalysis
                        .split('**Quick Tips**')[1]
                        ?.trim()
                        .split('•')
                        .filter(tip => tip.trim())
                        .map((tip, index) => {
                          const cleanTip = tip.replace(/\*\*/g, '').trim();
                          const [title, content] = cleanTip.split(':').map(s => s.trim());
                          if (!title || !content) return null;
                          
                          const baseTitle = title
                            .replace('recommendation', '')
                            .replace('suggestion', '')
                            .replace('advice', '')
                            .trim();
                          
                          return (
                            <div key={index} className="flex items-start gap-2">
                              <ChevronRight size={16} className="mt-1 flex-shrink-0 text-blue-400" />
                              <div>
                                <span className="font-semibold text-blue-400">{baseTitle}:</span>
                                <span className="ml-1">{content}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BMICalculator; 
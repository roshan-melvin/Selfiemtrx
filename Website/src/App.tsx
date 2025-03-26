import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  Camera as CameraIcon,
  Box,
  Users,
  Clock,
  Ruler,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  X,
  Menu,
  ChevronDown,
  Share2,
  Download,
  Info,
  Shield,
  ArrowLeft,
  User,
  Settings,
  LogOut,
  Crown,
  Check,
  Flame,
  TrendingUp,
  Award,
  MessageCircle,
  Bookmark,
  Filter,
  Search,
  Hash,
  Sparkles,
  Target,
  LineChart,
  Trophy,
  Zap,
  Calendar,
  Dumbbell,
  Smile,
  Shirt,
  Heart,
  Brain,
  Medal,
  ThumbsUp,
  UserPlus,
  Lightbulb,
  Plus,
  Gift,
  Sticker,
  Volume2,
  Mic,
  Headphones,
  Bell,
  Pin,
  Play,
  MessageSquare
} from 'lucide-react';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { getGeminiResponse } from './services/gemini';
import GoogleSignIn from './GoogleSignIn';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import BMICalculator from './components/BMICalculator';
import VirtualTryOn from './components/VirtualTryOn';
// Import your logo
import logo from '/logo/logo.png'; // Update the path to where your logo is located

// Add TypeScript declarations for chatbase
declare global {
  interface Window {
    chatbase: any;
  }
}

// Add this type for model selection
type ModelType = 'free' | 'pro';

// Add this type for user subscription status
type SubscriptionStatus = 'free' | 'monthly_pro' | 'annual_pro';

// Add this interface for user profile
interface UserProfile {
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate?: Date;
}

// Add these with your other imports at the top
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase/config';

// Add to your imports at the top
import { getUserStats, updateUserStats, formatLastAnalysis, type UserStats } from './utils/userStats';

// Add new interfaces for community types
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  progress: number;
}

interface CommunityPost {
  id: string;
  type: 'transformation' | 'guide' | 'question' | 'motivation';
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    level: number;
    badges: string[];
  };
  metrics: {
    upvotes: number;
    comments: number;
    saves: number;
  };
  tags: string[];
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  createdAt: Date;
}

// Add this near the top with other interfaces
interface ChannelContent {
  id: string;
  name: string;
  description: string;
  posts: {
    name: string;
    time: string;
    message: string;
    avatar: {
      url: string;
      gradient: string;
    };
    media?: {
      type: 'image';
      url: string;
      alt: string;
    } | {
      type: 'image';
      url: string;
      alt: string;
    }[];
  }[];
}

const ChatbaseWidget = ({ currentView }: { currentView: string }) => {
  useEffect(() => {
    let scriptElement: HTMLScriptElement | null = null;

    const initializeChatbase = () => {
      // Remove any existing chatbase elements first
      cleanup();

      // Add custom CSS to hide the scroll button
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .chatbase-bubble-btn {
          display: none !important;
        }
      `;
      document.head.appendChild(styleElement);

      scriptElement = document.createElement('script');
      scriptElement.innerHTML = `
        (function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="DL9xNrg5sLItNpIiFarR7";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();
      `;
      document.head.appendChild(scriptElement);
    };

    const cleanup = () => {
      // Remove any custom styles
      const styles = document.querySelectorAll('style');
      styles.forEach(style => {
        if (style.textContent?.includes('chatbase-bubble-btn')) {
          style.remove();
        }
      });

      // Remove the initialization script if it exists
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }

      // Remove any existing chatbase elements
      const elements = document.querySelectorAll('[id*="chatbase"], [class*="chatbase"], iframe[src*="chatbase"]');
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // Clear any chatbase related scripts
      const scripts = document.querySelectorAll('script[src*="chatbase"]');
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });

      // Reset chatbase state
      if (window.chatbase) {
        delete window.chatbase;
      }
    };

    if (currentView === 'home') {
      initializeChatbase();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [currentView]);

  return null;
};

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'upload' | 'camera' | 'bmi-calculator' | 'features' | 'how-it-works' | 'privacy' | 'profile' | 'upgrade' | 'community' | 'virtual-try-on'>('home');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showTooltip, setShowTooltip] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [previousView, setPreviousView] = useState<'home' | 'upload' | 'camera' | 'community' | 'virtual-try-on' | 'bmi-calculator'>('home');
  const [analysisResponse, setAnalysisResponse] = useState<string>('');
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [highlightButtons, setHighlightButtons] = useState(false);
  const [user] = useAuthState(auth);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showPersonInfo, setShowPersonInfo] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // First, add a state for the analysis output
  const [analysisOutput, setAnalysisOutput] = useState<string>('');
  // Add new state for user's subscription status
  const [userSubscription, setUserSubscription] = useState<SubscriptionStatus>('free');

  // Add this with your other useState declarations
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const countries = [
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
  ];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [analysisResult, setAnalysisResult] = useState<{
    age?: number;
    country?: string;
    gender?: string;
    height_depth_based?: number;
    height_reference_based?: number;
    weight_range?: string;
    emotion?: string;
    detected_objects?: {
      object_name: string;
      confidence_score: number;
      height_cm: number;
    }[];
  } | null>(null);

  // Add this ref for the features section
  const featuresRef = useRef<HTMLElement>(null);

  // Add new state for model selection
  const [selectedModel, setSelectedModel] = useState<ModelType>('free');

  // Add this function to check auth and handle navigation
  const handleAuthenticatedNavigation = (view: 'upload' | 'camera' | 'community' | 'virtual-try-on') => {
    if (user) {
      // User is authenticated, allow navigation
      setCurrentView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      resetBMIStates();
    } else {
      // User is not authenticated, show signup modal instead of login
      setPreviousView(view);
      setShowSignUp(true); // Changed from setShowLogin(true) to setShowSignUp(true)
    }
  };

  const handleNavigation = (view: 'home' | 'upload' | 'camera' | 'bmi-calculator' | 'features' | 'how-it-works' | 'privacy' | 'profile' | 'upgrade' | 'community' | 'virtual-try-on') => {
    if (view === 'features' && currentView === 'home') {
      featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setCurrentView(view);
      // Reset states when changing views
      setSelectedImage(null);
      setUploadProgress(0);
      setError(null);
      setAnalysisResult(null);
      setAnalysisOutput(''); // Reset analysis output
      
      // Scroll to top when navigating to a new view (except for features section)
      if (view === 'home' || view !== 'features') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (view !== 'bmi-calculator') {
        resetBMIStates();
      }
    }
  };

  const handleBack = () => {
    if (currentView === 'how-it-works') {
      setCurrentView('home');
    } else if (showLogin || showSignUp) {
      // If login/signup modal is open, just close it and stay on home
      setShowLogin(false);
      setShowSignUp(false);
      setCurrentView('home');
    } else {
      setCurrentView(previousView);
      setSelectedImage(null);
      setUploadProgress(0);
      setError(null);
      setAnalysisResult(null);
      setAnalysisOutput(''); // Reset analysis output
      resetBMIStates();
    }
  };

  const handleAuth = (type: 'login' | 'signup') => {
    setPreviousView('home'); // Set to 'home' as default
    if (type === 'login') {
      setShowLogin(true);
      setShowSignUp(false);
    } else {
      setShowSignUp(true);
      setShowLogin(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        setError('Error playing video stream');
        console.error('Error playing video:', err);
      });
    }
  }, [isCameraActive, stream]);

  useEffect(() => {
    if (currentView !== 'camera' && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [currentView, stream]);

  // Modify simulateUpload to handle different model processing
  const simulateUpload = async (imageData: string) => {
    if (!user) {
      setError('Please log in to analyze images');
      return;
    }

    // Check remaining credits for free users
    if (userSubscription === 'free' && userStats) {
      if (userStats.remainingCredits <= 0) {
        setError('No credits remaining. Please upgrade to Pro for unlimited analyses.');
        return;
      }
    }

    setError(null);
    setUploadProgress(0);
    setIsLoading(true);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 200);

    try {
      // Update user stats first
      const updatedStats = await updateUserStats(user.uid);
      setUserStats(updatedStats);

      // Rest of your existing analysis code...
      if (selectedModel === 'pro') {
        const advancedResponse = await getGeminiResponse(
          `Estimated Attributes:
            Height = "" cm
            Weight = "" kg
            Age = "" years
            Gender = ""
            Emotion = "" (section over, give a big line break)
            
            Object Detection:
            No. of Persons Detected = ""
            No. of Objects Detected = "" (give a big line break)
            Detected Objects:
            (List only non-human objects such as:
            - Electronic devices (phones, laptops, cameras)
            - Furniture (chairs, tables, desks)
            - Clothing items (jackets, shirts, hats)
            - Accessories (bags, watches, jewelry)
            - Animals (dogs, cats, birds, etc.)
            - Other items (books, bottles, glasses)
            
            DO NOT include body parts or facial features.
            Format each object as follows:)
            Object Name: ""
            Confidence: ""
            Estimated Height: "" cm

            (Repeat the above 3 lines for each detected object)
            (section over, give a big line break)

        Facial Analysis:
            Face Shape: Provide a detailed 2-3 sentence description of the face shape, including its overall form, proportions, and how it affects facial harmony.

            Eye Shape and Expression: Describe the eye shape, size, positioning, and any unique characteristics in 2-3 sentences. Include details about how they contribute to facial expression.

            Nose Characteristics: Explain the nose structure, bridge, tip, and how it complements other facial features in 2-3 sentences.

            Lip Shape and Fullness: Detail the lip shape, volume, cupid's bow, and overall balance in 2-3 sentences.

            Jawline Definition: Describe jawline strength, angle, and how it frames the face in 2-3 sentences.

            Facial Symmetry: Analyze overall facial balance and harmony in 2-3 sentences, noting how features work together.

            General Expression: Describe the natural expression and the impression it creates in 2-3 sentences.

            Style Enhancement Tips (provide exactly 3 detailed suggestions):
            1. A specific hairstyle or grooming recommendation that complements their features
            2. A personalized suggestion about facial features enhancement through skincare or subtle techniques
            3. A style recommendation about accessories or clothing that would enhance their facial features

            Only fill the values inside the quotation marks with a single estimated value each—no extra words, characters, or symbols. DO NOT INCLUDE THE QUOTATIONS ITS FOR A PLACEHOLDER STUFF. 
            Use all contextual clues available to make the most accurate assessment possible.
            DO NOT SCRAP INTERNET FOR INFORMATION ON FAMOUS PEOPLE/CELEBRITIES. USE YOUR OWN KNOWLEDGE TO ANALYSE LIKE YOU WOULD FOR OTHERS.
            IMPORTANT: Do not mention the person in the analysis even if they are a well known celebrity. Only detect non-human objects. Exclude all body parts from object detection.`,
          imageData
        );

        setAnalysisOutput(advancedResponse); // Store advanced analysis only
        setAnalysisResult(null); // Clear basic analysis results
      } else {
        // Free model processing - basic analysis only
        const response = await fetch('https://selfiemtrx-mtrx-m1.hf.space/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData, country: selectedCountry }),
        });

        if (!response.ok) {
          throw new Error('Failed to process image');
        }

        const data = await response.json();
        setAnalysisResult(data);
        setAnalysisOutput(''); // Clear any previous advanced analysis
      }

      setUploadProgress(100);
      setSelectedImage(imageData);
      // Set random products after analysis is complete
      setRandomProducts(getRandomProducts(skinCareProducts, 4));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error uploading image');
      } else {
        setError('Error uploading image');
      }
      console.error('Error:', err);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        simulateUpload(e.target.result as string);
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      setError('Please drop an image file');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          stopCamera();
          simulateUpload(imageData);
        }
      } catch (err) {
        setError('Error capturing photo');
        console.error('Error taking photo:', err);
      }
    }
  };

  const renderUploadProgress = () => {
    if (uploadProgress > 0 && uploadProgress < 100) {
      return (
        <div className="mt-6">
          <div className="relative">
            {/* Progress bar background */}
            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
              {/* Animated gradient progress bar */}
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 animate-gradient-x transition-all duration-300 relative"
                style={{ width: `${uploadProgress}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent animate-shine"></div>
              </div>
            </div>
            
            {/* Processing message with typing animation */}
            <div className="text-center mt-4">
              <p className="text-lg font-medium text-blue-400 mb-2">
                {uploadProgress < 30 && "Initializing AI analysis..."}
                {uploadProgress >= 30 && uploadProgress < 60 && "Processing image details..."}
                {uploadProgress >= 60 && uploadProgress < 90 && "Generating measurements..."}
                {uploadProgress >= 90 && "Almost there..."}
              </p>
              <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
              </p>
            </div>

            {/* Processing tips */}
            <div className="mt-6 max-w-md mx-auto text-center">
              <p className="text-sm text-blue-300/70 italic">
                {[
                  "AI is analyzing facial features and proportions...",
                  "Calculating measurements using advanced algorithms...",
                  "Detecting objects and estimating dimensions...",
                  "Processing environmental factors for accuracy...",
                ][Math.floor((uploadProgress / 100) * 4)] || "Almost done..."}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSocialMedia = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        window.open('https://www.instagram.com/selfiemtrx', '_blank');
        break;
      case 'Twitter':
        window.open('https://www.twitter.com/selfiemtrx', '_blank');
        break;
      case 'LinkedIn':
        window.open('https://www.linkedin.com/company/selfiemtrx', '_blank');
        break;
      default:
        console.error('Unknown social media platform:', platform);
    }
  };

  const handleShareResults = () => {
    if (selectedModel === 'free' && analysisResult) {
      const text = `Check out my analysis results:

Person's Info:
Age: ${analysisResult.age || 'N/A'} years
Gender: ${analysisResult.gender || 'N/A'}
Height (Depth-Based): ${analysisResult.height_depth_based?.toFixed(2) || 'N/A'} cm
Height (Reference-Based): ${analysisResult.height_reference_based?.toFixed(2) || 'N/A'} cm
Weight Range: ${analysisResult.weight_range || 'N/A'} kg
Emotion: ${analysisResult.emotion || 'N/A'}

Object Details:
Number of Persons: ${analysisResult.detected_objects?.filter(obj => obj.object_name === 'person').length || 0}
Number of Objects: ${analysisResult.detected_objects?.filter(obj => obj.object_name !== 'person').length || 0}

Detected Objects:
${analysisResult.detected_objects?.map(obj => 
  `- ${obj.object_name} (Confidence: ${(obj.confidence_score * 100).toFixed(2)}%)`
).join('\n') || 'No objects detected'}`;

      if (navigator.share) {
        navigator.share({
          title: 'Selfie Metrics Analysis',
          text: text,
          url: window.location.href,
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(text)
          .then(() => alert('Results copied to clipboard!'))
          .catch(() => alert(text));
      }
    } else if (selectedModel === 'pro' && analysisOutput) {
      const text = `Pro Model Analysis Results:

${analysisOutput}`;

      if (navigator.share) {
        navigator.share({
          title: 'Pro Model Analysis',
          text: text,
          url: window.location.href,
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(text)
          .then(() => alert('Results copied to clipboard!'))
          .catch(() => alert(text));
      }
    }
  };

  const handleDownloadReport = () => {
    if (selectedModel === 'free' && analysisResult) {
      const text = `Selfie Metrics Analysis Report

Person's Info:
--------------
Age: ${analysisResult.age || 'N/A'} years
Gender: ${analysisResult.gender || 'N/A'}
Height (Depth-Based): ${analysisResult.height_depth_based?.toFixed(2) || 'N/A'} cm
Height (Reference-Based): ${analysisResult.height_reference_based?.toFixed(2) || 'N/A'} cm
Weight Range: ${analysisResult.weight_range || 'N/A'} kg
Emotion: ${analysisResult.emotion || 'N/A'}

Object Details:
--------------
Number of Persons Detected: ${analysisResult.detected_objects?.filter(obj => obj.object_name === 'person').length || 0}
Number of Objects Detected: ${analysisResult.detected_objects?.filter(obj => obj.object_name !== 'person').length || 0}

Detected Objects:
${analysisResult.detected_objects?.map(obj => 
  `- ${obj.object_name} (Confidence: ${(obj.confidence_score * 100).toFixed(2)}%)`
).join('\n') || 'No objects detected'}`;

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selfie_metrics_report.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else if (selectedModel === 'pro' && analysisOutput) {
      const text = `Pro Model Analysis Report

${analysisOutput}`;

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pro_model_analysis_report.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Add this new function to handle all BMI state resets
  const resetBMIStates = () => {
    setError(null);
    setIsLoading(false);
  };

  // Add this function to handle home navigation
  const handleHomeClick = () => {
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGetStarted = () => {
    setCurrentView('home');
    // Set highlight state to true when navigating
    setHighlightButtons(true);
    // Remove highlight after animation
    setTimeout(() => {
      setHighlightButtons(false);
    }, 3000); // 3 seconds highlight duration
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      const response = await getGeminiResponse(prompt, selectedImage);
      setResults(response);
    } catch (error) {
      console.error('Error analyzing:', error);
      // Handle error appropriately
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update the UI components to show model selection instead of the Analysis button
  const renderModelSelection = () => (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Choose Your Analysis Model</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free Model */}
        <button 
          onClick={() => setSelectedModel('free')}
          className={`p-6 rounded-xl border transition-all ${
            selectedModel === 'free' 
              ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20' 
              : 'bg-white/5 border-gray-700 hover:bg-white/10'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Box size={24} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">mtrx-M1</h3>
                <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                  Free
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-blue-400" />
                  Basic measurements
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-blue-400" />
                  Standard processing speed
                </li>
              </ul>
            </div>
          </div>
        </button>

        {/* Pro Model */}
        <div className={`p-6 rounded-xl border transition-all ${
          userSubscription === 'free'
            ? 'bg-white/5 border-gray-700 cursor-not-allowed' 
            : selectedModel === 'pro' 
              ? 'bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/20 cursor-pointer' 
              : 'bg-white/5 border-gray-700 hover:bg-white/10 cursor-pointer'
        }`}
        onClick={() => {
          if (userSubscription !== 'free') {
            setSelectedModel('pro');
          }
        }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Crown size={24} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">mtrx-M2</h3>
                <span className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                  <Crown size={12} />
                  Pro
                </span>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-purple-400" />
                  Advanced facial analysis
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-purple-400" />
                  2x faster processing
                </li>
              </ul>
              {userSubscription === 'free' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentView('upgrade');
                  }}
                  className="mt-3 text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  <span>View Pro features</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Add this function to render analysis results
  const renderAnalysisResults = () => {
    if (!selectedImage) return null;

    // Check if the response is the multiple people error message
    if (selectedModel === 'pro' && analysisOutput === "Cannot process selfies/images with more than one person") {
      return (
        <div className="mt-8 p-6 bg-red-500/10 rounded-lg border border-red-500/50">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-red-400 flex-shrink-0 mt-1" />
            <p className="text-red-400 font-medium">
              Cannot process selfies/images with more than one person
            </p>
          </div>
        </div>
      );
    }

    if (selectedModel === 'free' && analysisResult?.error === "Cannot process selfies/images with more than one person") {
      return (
        <div className="mt-8 p-6 bg-red-500/10 rounded-lg border border-red-500/50">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-red-400 flex-shrink-0 mt-1" />
            <p className="text-red-400 font-medium">
              Cannot process selfies/images with more than one person
            </p>
          </div>
        </div>
      );
    }

    // Only show analysis results if we don't have the error message
    return (selectedModel === 'free' ? analysisResult : analysisOutput) && (
      <div className="mt-8 p-6 bg-white/5 rounded-lg border border-gray-700">
        {/* Add disclaimer banner with updated colors */}
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-red-400 font-semibold mb-1">AI Analysis Disclaimer</h4>
              <p className="text-gray-300 text-sm">
                Results are AI-generated estimates and won't be 100% accurate. Results may vary based on image quality, angle, and lighting. 
                Please use these insights as general guidance only.
              </p>
            </div>
          </div>
        </div>

        {selectedModel === 'free' ? (
          // Free model display
          <>
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => setShowPersonInfo(true)}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  showPersonInfo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Person's Info
              </button>
              <button
                onClick={() => setShowPersonInfo(false)}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !showPersonInfo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Object Details
              </button>
            </div>
            {showPersonInfo ? (
              // Person info display
              <div className="mt-6 p-6 bg-white/5 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Person's Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 mb-1">Height</p>
                    <p className="text-2xl font-bold">{analysisResult?.height_depth_based?.toFixed(2) || 'N/A'} cm</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 mb-1">Weight</p>
                    <p className="text-2xl font-bold">{analysisResult?.weight_range || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 mb-1">Age</p>
                    <p className="text-2xl font-bold">{analysisResult?.age || 'N/A'} years</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 mb-1">Gender</p>
                    <p className="text-2xl font-bold capitalize">{analysisResult?.gender || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-gray-400 mb-1">Emotion</p>
                    <p className="text-2xl font-bold capitalize">{analysisResult?.emotion || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Object details display
              <div className="mt-6 p-6 bg-white/5 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Object Details</h3>
                <div className="space-y-4">
                  {analysisResult.detected_objects && (
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
                            <div key={index} className="p-3 bg-white/5 rounded-lg">
                              <p className="text-lg font-bold">{obj.object_name}</p>
                              <p className="text-gray-400">Confidence: {(obj.confidence_score * 100).toFixed(2)}%</p>
                              <p className="text-gray-400">Height: {obj.height_cm.toFixed(2)} cm</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // Pro model display
          <>
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={() => setShowPersonInfo(true)}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  showPersonInfo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Person's Info
              </button>
              <button
                onClick={() => setShowPersonInfo(false)}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !showPersonInfo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Object Details
              </button>
            </div>
            {showPersonInfo ? (
              // Pro model Person's Info display
              <div className="mt-6 p-6 bg-white/5 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Person's Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisOutput.split('\n').map((line, index) => {
                    if (line.includes('Height =')) {
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-gray-400 mb-1">Height</p>
                          <p className="text-2xl font-bold">{line.split('=')[1].trim().replace(/"/g, '')}</p>
                        </div>
                      );
                    }
                    if (line.includes('Weight =')) {
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-gray-400 mb-1">Weight</p>
                          <p className="text-2xl font-bold">{line.split('=')[1].trim().replace(/"/g, '')}</p>
                        </div>
                      );
                    }
                    if (line.includes('Age =')) {
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-gray-400 mb-1">Age</p>
                          <p className="text-2xl font-bold">{line.split('=')[1].trim().replace(/"/g, '')}</p>
                        </div>
                      );
                    }
                    if (line.includes('Gender =')) {
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-gray-400 mb-1">Gender</p>
                          <p className="text-2xl font-bold">{line.split('=')[1].trim().replace(/"/g, '')}</p>
                        </div>
                      );
                    }
                    if (line.includes('Emotion =')) {
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-gray-400 mb-1">Emotion</p>
                          <p className="text-2xl font-bold">{line.split('=')[1].trim().replace(/"/g, '')}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ) : (
              // Pro model Object Details display
              <div className="mt-6 p-6 bg-white/5 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Object Details</h3>
                <div className="space-y-4">
                  {analysisOutput.split('\n').map((line, index) => {
                    if (line.includes('Object Name:')) {
                      const objectName = line.split(':')[1].trim();
                      const confidenceLine = analysisOutput.split('\n')[index + 1];
                      const heightLine = analysisOutput.split('\n')[index + 2];
                      const confidence = confidenceLine.split(':')[1].trim();
                      const height = heightLine.split(':')[1].trim();
                      return (
                        <div key={index} className="p-4 bg-white/5 rounded-lg">
                          <p className="text-lg font-bold">{objectName}</p>
                          <p className="text-gray-400">Confidence: {confidence}</p>
                          <p className="text-gray-400">Estimated Height: {height}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            {/* Pro model Facial Analysis display */}
            <div className="mt-6 p-6 bg-white/5 rounded-lg border border-gray-700">
              <h3 className="text-2xl font-bold mb-6 text-gray-200">
                Facial Analysis
              </h3>
              <div className="space-y-6">
                {analysisOutput.split('\n').map((line, index) => {
                  if (line.includes('Face Shape:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Face Shape
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('Eye Shape and Expression:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Eye Shape and Expression
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('Nose Characteristics:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Nose Characteristics
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('Lip Shape and Fullness:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Lip Shape and Fullness
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('Jawline Definition:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Jawline Definition
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('Facial Symmetry:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Facial Symmetry
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  if (line.includes('General Expression:')) {
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          General Expression
                        </p>
                        <p className="text-lg text-gray-300">{line.split(':')[1].trim()}</p>
                      </div>
                    );
                  }
                  // Add Style Enhancement Tips section
                  if (line.includes('Style Enhancement Tips')) {
                    const tips = [
                      analysisOutput.split('\n')[index + 1],
                      analysisOutput.split('\n')[index + 2],
                      analysisOutput.split('\n')[index + 3]
                    ];
                    return (
                      <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <p className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Style Enhancement Tips
                        </p>
                        <ul className="space-y-2">
                          {tips.map((tip, i) => (
                            <li key={i} className="text-lg text-gray-300">
                              {tip.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </>
        )}

        {/* Share and download buttons - added for both models */}
        <div className="mt-6 flex gap-4 justify-end">
          <button
            onClick={handleShareResults}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <Share2 size={20} />
            Share Results
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <Download size={20} />
            Download Report
          </button>
        </div>

        {/* Tailored for you section - only show for Pro model */}
        {selectedModel === 'pro' && (
          <div className="mt-8 p-6 bg-white/5 rounded-lg border border-purple-500/30">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Crown size={24} className="text-purple-400" />
              Tailored for You
            </h3>
            <p className="text-gray-300 mb-6">
              Based on your facial analysis, here are some recommended products:
            </p>
            
            {/* Horizontal scrolling product list */}
            <div className="relative">
              <div className="overflow-x-auto pb-4 hide-scrollbar">
                <div className="flex gap-4 min-w-max">
                  {randomProducts.map((product) => (
                    <div key={product.id} className="w-64 flex-shrink-0 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                      <div className="mb-4 aspect-square rounded-lg overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="font-semibold mb-2">{product.name}</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        {product.description}
                      </p>
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                      >
                        View on Amazon*
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              * These recommendations are personalized based on your facial analysis. Please consult with a beauty expert for professional advice.
              <br />* Links are affiliated.
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleRazorpayPayment = (plan: 'monthly' | 'yearly') => {
    if (!user) return;

    const options = {
      key: 'rzp_live_XbVRnitf24iTYy',
      amount: plan === 'monthly' ? 100 : 180000, // Keep ₹1 for testing
      currency: 'INR',
      name: 'Selfiemtrx Pro',
      description: `${plan === 'monthly' ? 'Monthly' : 'Annual'} Pro Subscription`,
      handler: async function(response: any) {
        if (response.razorpay_payment_id) {
          const now = new Date();
          const validUntil = new Date(now);
          validUntil.setMonth(now.getMonth() + (plan === 'monthly' ? 1 : 12));

          // Changed from 'subscriptions' to 'paid_subscriptions'
          await setDoc(doc(db, 'paid_subscriptions', user.uid), {
            createdAt: Timestamp.now(),
            status: plan === 'monthly' ? 'monthly_pro' : 'annual_pro',
            validUntil: Timestamp.fromDate(validUntil),
            paymentId: response.razorpay_payment_id,
            amount: plan === 'monthly' ? 1 : 1800
          });

          setUserSubscription(plan === 'monthly' ? 'monthly_pro' : 'annual_pro');
        }
      },
      prefill: {
        name: user?.displayName || 'User',
        email: user?.email || 'user@example.com'
      },
      theme: {
        color: '#6a5acd'
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'upload':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-8">Upload Your Image</h1>
              <div 
                className={`backdrop-blur-lg bg-white/5 rounded-2xl p-4 md:p-8 border-2 border-dashed transition-all ${
                  isDragging ? 'border-blue-400 bg-white/10' : 'border-gray-700'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {error && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                    {error}
                  </div>
                )}
                {selectedImage ? (
                  <div className="relative max-w-md mx-auto">
                    <div className="aspect-w-4 rounded-lg overflow-hidden">
                      <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setError(null);
                        setAnalysisResult(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Upload size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-xl mb-4">
                      Drag and drop your image here
                    </p>
                    <p className="text-gray-400 mb-4">or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Choose File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
              {renderModelSelection()}
              {renderUploadProgress()}
              {renderAnalysisResults()}
            </div>
          </div>
        );

      case 'camera':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-8">Take a Selfie</h1>
              <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-4 md:p-8 border border-gray-700">
                {error && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                    {error}
                  </div>
                )}
                {selectedImage ? (
                  <div className="relative max-w-md mx-auto">
                    <div className="aspect-w-4 rounded-lg overflow-hidden">
                      <img
                        src={selectedImage}
                        alt="Captured"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setError(null);
                        setAnalysisResult(null);
                        startCamera();
                      }}
                      className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors mx-auto block"
                    >
                      Take Another Photo
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    {isCameraActive ? (
                      <div>
                        <div className="relative max-w-md mx-auto">
                          <div className="aspect-w-4 rounded-lg overflow-hidden">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover rounded-lg transform scale-x-[-1]"
                            />
                          </div>
                          <div className="absolute inset-0 border-4 border-blue-500/50 rounded-lg pointer-events-none" />
                        </div>
                        <button
                          onClick={takePhoto}
                          className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                        >
                          Take Photo
                        </button>
                      </div>
                    ) : (
                      <div className="py-12">
                        <CameraIcon
                          size={48}
                          className="text-gray-400 mx-auto mb-4"
                        />
                        <p className="text-xl mb-4">Camera access required</p>
                        <button
                          onClick={startCamera}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                        >
                          Start Camera
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {renderModelSelection()}
              {renderUploadProgress()}
              {renderAnalysisResults()}
            </div>
          </div>
        );
      case 'bmi-calculator':
        return (
          <BMICalculator 
            onBack={() => {
              handleBack();
              resetBMIStates();
            }} 
          />
        );
      case 'how-it-works':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            {/* Add Back Button */}
            <button
              onClick={() => setCurrentView('home')}
              className="mb-6 flex items-center gap-2 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </button>

            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-center mb-12">How It Works</h1>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500/20 rounded-full p-3">
                      <CameraIcon size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">1. Capture or Upload 📸</h3>
                      <p className="text-gray-300">
                        Take a photo or upload an existing one. While full-body photos provide greater accuracy,
                        selfies are also accepted for basic analysis.
                      </p>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Good lighting conditions
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Clear, unobstructed view
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Natural pose
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-500/20 rounded-full p-3">
                      <Box size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">2. AI Analysis 🤖</h3>
                      <p className="text-gray-300">
                        Our advanced AI processes your image to analyze:
                      </p>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Body proportions and measurements
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Object detection and dimensions
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Height and physical characteristics
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-500/20 rounded-full p-3">
                      <Ruler size={24} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">3. Get Results 📊</h3>
                      <p className="text-gray-300">
                        Receive comprehensive analysis including:
                      </p>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> Height and weight estimations
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> Object dimensions and measurements
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> Age and physical characteristics
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips Section */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 mt-12">
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <Info size={24} className="text-blue-400" />
                    Pro Tips for Best Results ✨
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-400">Photo Tips 📸</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Use well-lit environments
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Stand against a plain background
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> Wear fitted clothing
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-purple-400">Technical Tips 🔧</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Use high-resolution images
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Keep device steady
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Ensure good internet connection
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center">
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Privacy Policy
                </span>
                <span className="ml-2">🔒</span>
              </h1>

              <div className="space-y-8">
                {/* Main Policy Statement */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500/20 rounded-full p-3">
                      <Shield size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Data Protection & Privacy</h3>
                      <p className="text-gray-300">
                        At Selfiemtrx, we prioritize your privacy and data security. We want to be clear about our practices:
                      </p>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> We collect personal data necessary for account creation and authentication.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> We use cookies and local storage to manage user sessions and preferences.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> All processing is done in real-time, and we ensure data security.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How We Handle Data */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-500/20 rounded-full p-3">
                      <Info size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">How We Handle Your Data</h3>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Images are processed instantly and never saved.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Personal information is used solely for authentication and user experience enhancement.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-purple-400">•</span> Results are displayed only to you and not stored permanently.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Your Control */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 transform transition-all hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-500/20 rounded-full p-3">
                      <Users size={24} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Your Control</h3>
                      <ul className="mt-3 space-y-2 text-gray-300">
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> You can manage your account settings and data preferences.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> We provide options to delete your account and data upon request.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> We ensure transparency in how your data is used.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="backdrop-blur-lg bg-white/5 rounded-xl p-6 mt-12">
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <Mail size={24} className="text-blue-400" />
                    Questions or Concerns?
                  </h3>
                  <p className="text-gray-300">
                    If you have any questions about our privacy practices, feel free to contact us at:{' '}
                    <a 
                      href="mailto:selfiemtrx@gmail.com" 
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      selfiemtrx@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-gray-700">
                {/* Profile Header */}
                <div className="flex items-center gap-6 mb-8">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full border-4 border-blue-500/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold">
                      {user?.displayName?.[0] || user?.email?.[0]}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{user?.displayName || 'User'}</h1>
                    <p className="text-gray-400">{user?.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {userSubscription.includes('pro') ? (
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-sm font-semibold flex items-center gap-2">
                          <Crown size={14} />
                          Pro Member
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm">
                          Free Plan
                        </span>
                      )}
                      {!userSubscription.includes('pro') && (
                        <button 
                          onClick={() => setCurrentView('upgrade')}
                          className="px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
                        >
                          Upgrade to Pro
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Total Analyses</h3>
                    <p className="text-2xl font-bold">{userStats?.totalAnalyses || 0}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Last Analysis</h3>
                    <p className="text-2xl font-bold">
                      {userStats?.lastAnalysis 
                        ? formatLastAnalysis(userStats.lastAnalysis)
                        : 'Never'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Remaining Credits</h3>
                    <p className="text-2xl font-bold">
                      {userSubscription.includes('pro') 
                        ? '∞' 
                        : `${userStats?.remainingCredits || 0}/10`}
                    </p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    {/* Activity items */}
                    <div className="p-4 bg-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Camera size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">Image Analysis</p>
                          <p className="text-sm text-gray-400">2 days ago</p>
                        </div>
                      </div>
                      <button className="text-blue-400 hover:text-blue-300">View</button>
                    </div>
                    {/* Add more activity items as needed */}
                  </div>
                </div>

                {/* Account Settings */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Account Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive updates and analysis results</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-400">Add an extra layer of security</p>
                      </div>
                      <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'upgrade':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-center mb-12">Upgrade Your Plan</h1>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Free Plan */}
                <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-gray-700">
                  <h2 className="text-xl font-bold mb-4">Free Plan</h2>
                  <p className="text-3xl font-bold mb-4">₹0<span className="text-gray-400 text-lg">/month</span></p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>10 analyses per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-gray-400" />
                      <span className="text-gray-400">Basic mtrx-M1 model (slower)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>Basic measurements only</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>Email support</span>
                    </li>
                  </ul>
                  <button 
                    className="w-full py-2 rounded-lg bg-gray-600 text-gray-300 cursor-default"
                    disabled={true}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {userSubscription === 'free' ? (
                        <>
                          <Check size={16} />
                          Current Plan
                        </>
                      ) : (
                        'Basic Plan'
                      )}
                    </span>
                  </button>
                </div>

                {/* Monthly Pro Plan */}
                <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-blue-500 relative">
                  <div className="absolute top-4 right-4 px-2 py-1 bg-blue-500/20 rounded-full text-blue-400 text-sm">
                    Popular
                  </div>
                  <h2 className="text-xl font-bold mb-4">Monthly Pro</h2>
                  <p className="text-3xl font-bold mb-4">₹499<span className="text-gray-400 text-lg">/month</span></p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>Unlimited analyses</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-blue-400" />
                      <span className="text-blue-400">Advanced mtrx-M2 model (2x faster)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>Detailed facial analysis & style tips</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>AI-powered product recommendations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>Priority email support</span>
                    </li>
                  </ul>
                  {userSubscription === 'monthly_pro' ? (
                    <button 
                      className="w-full py-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg font-semibold cursor-default"
                      disabled
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Check size={16} />
                        Current Plan
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRazorpayPayment('monthly')}
                      className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
                    >
                      Subscribe Monthly
                    </button>
                  )}
                </div>

                {/* Annual Pro Plan */}
                <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-purple-500 relative">
                  <div className="absolute top-4 right-4 px-2 py-1 bg-purple-500/20 rounded-full text-purple-400 text-sm">
                    Best Value
                  </div>
                  <h2 className="text-xl font-bold mb-4">Annual Pro</h2>
                  <div className="mb-4">
                    <p className="text-3xl font-bold">₹150<span className="text-gray-400 text-lg">/month</span></p>
                    <p className="text-sm text-gray-400">Billed annually at ₹1,800</p>
                    <p className="text-sm text-green-400 mt-1">Save 70% vs monthly</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-green-400" />
                      <span>All Monthly Pro features included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-purple-400" />
                      <span>Early access to new features</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-purple-400" />
                      <span>Dedicated support team</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={20} className="text-purple-400" />
                      <span>24/7 contact support</span>
                    </li>
                  </ul>
                  {userSubscription === 'annual_pro' ? (
                    <button 
                      className="w-full py-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg font-semibold cursor-default"
                      disabled
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Check size={16} />
                        Current Plan
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRazorpayPayment('yearly')}
                      className="w-full py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-size-200 rounded-lg hover:bg-pos-100 transition-all duration-500 group relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transform hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iMyIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                      <span className="relative flex items-center justify-center gap-2 px-2">
                        <Crown 
                          size={16} 
                          className="text-white transform group-hover:scale-110 transition-all duration-300 [filter:drop-shadow(0_0_8px_rgba(168,85,247,0.8))] animate-pulse"
                        />
                        <span className="font-semibold bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent group-hover:opacity-90">
                          Subscribe Annually
                        </span>
                        <div className="absolute right-0 -translate-x-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-purple-200">
                          <span className="text-sm">Save 70%</span>
                        </div>
                      </span>
                      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 opacity-0 group-hover:opacity-30 blur-xl transition-opacity"></div>
                      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity"></div>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-center text-gray-400 mt-8">
                All plans include automatic renewal. Cancel anytime. Prices are in INR.
              </p>
            </div>
          </div>
        );
      case 'community':
        return (
          <div className="min-h-screen bg-[#313338] text-white flex">
            {/* Servers Sidebar */}
            <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2">
              {/* Home Button */}
                    <button
                      onClick={handleBack}
                className="w-12 h-12 bg-[#313338] rounded-[16px] hover:rounded-[12px] hover:bg-indigo-500 transition-all duration-200 flex items-center justify-center relative group"
                    >
                <img src="/logo/logo.png" alt="Home" className="w-7 h-7" />
                <div className="absolute -right-2 -top-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">3</div>
                    </button>
                    
              <div className="w-8 h-[2px] bg-[#2D2F32] rounded my-1" />
              
              {/* Server Icons */}
              {['Fitness', 'Nutrition', 'Wellness', 'Style'].map((server, index) => (
                <button 
                  key={index}
                  className="w-12 h-12 bg-[#313338] rounded-[16px] hover:rounded-[12px] hover:bg-indigo-500 transition-all duration-200 flex items-center justify-center group relative"
                >
                  <span className="absolute left-0 w-1 h-8 bg-white rounded-r-full scale-0 group-hover:scale-100 transition-transform" />
                  <span className="text-2xl font-bold">{server[0]}</span>
                    </button>
              ))}
              
              {/* Add Server Button */}
              <button className="w-12 h-12 bg-[#313338] rounded-[16px] hover:rounded-[12px] hover:bg-emerald-500 transition-all duration-200 flex items-center justify-center mt-2">
                <Plus size={25} className="text-emerald-500 hover:text-white" />
                    </button>
                  </div>

            {/* Channels Sidebar */}
            <div className="w-60 bg-[#2B2D31] flex flex-col">
              <div className="h-12 px-4 flex items-center shadow-md">
                <h2 className="font-semibold">Fitness Community</h2>
                </div>
              
              {/* Server Boost Status */}
              <div className="mx-2 mt-2 p-3 bg-[#393C41] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-pink-400" size={20} />
                  <span className="text-sm font-medium">Level 2 Boosted</span>
              </div>
                <div className="w-full h-2 bg-[#232428] rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-pink-500 to-purple-500" />
            </div>
                <p className="text-xs text-gray-400 mt-2">15/20 boosts to next level</p>
                    </div>
              
              {/* Channels List */}
              <div className="flex-1 px-2 py-3 space-y-2 overflow-y-auto">
                {[
                  {
                    category: "ANNOUNCEMENTS",
                    channels: [
                      { name: "announcements", unread: true, mentions: 2 },
                      { name: "rules", unread: false },
                      { name: "events", unread: true }
                    ]
                  },
                  {
                    category: "COMMUNITY",
                    channels: [
                      { name: "general", unread: true },
                      { name: "introductions", unread: false },
                      { name: "progress-pics", unread: true, mentions: 5 },
                      { name: "success-stories", unread: true },
                      { name: "motivation", unread: false }
                    ]
                  },
                  {
                    category: "FITNESS",
                    channels: [
                      { name: "workout-plans", unread: false },
                      { name: "nutrition", unread: true },
                      { name: "tips-and-tricks", unread: false },
                      { name: "form-check", unread: true },
                      { name: "supplements", unread: false }
                    ]
                  }
                      ].map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center px-1 text-xs font-semibold text-gray-400 hover:text-gray-200 cursor-pointer">
                      <ChevronDown size={12} />
                      <span className="ml-1">{category.category}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {category.channels.map((channel, channelIndex) => (
                        <button
                          key={channelIndex}
                          className="w-full px-2 py-1 flex items-center gap-2 text-gray-400 hover:text-gray-200 hover:bg-[#393C41] rounded group"
                        >
                          <Hash size={18} />
                          <span className={channel.unread ? "text-gray-200 font-medium" : ""}>{channel.name}</span>
                          {channel.mentions && (
                            <div className="ml-auto px-2 py-0.5 bg-red-500 rounded-full text-xs text-white">
                              {channel.mentions}
                          </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                            </div>

              {/* User Profile Section */}
              <div className="h-[52px] px-2 bg-[#232428] flex items-center gap-2">
                <div className="relative">
                  <img
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=1`}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#232428]" />
                          </div>
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-1">
                    {user?.displayName || 'Guest'}
                    {userSubscription.includes('pro') && (
                      <Crown size={12} className="text-yellow-500" />
                    )}
                        </div>
                  <div className="text-xs text-gray-400">Level 15 • Online</div>
                    </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-[#393C41] rounded">
                    <Mic size={16} />
                      </button>
                  <button className="p-1 hover:bg-[#393C41] rounded">
                    <Headphones size={16} />
                      </button>
                  <button className="p-1 hover:bg-[#393C41] rounded">
                    <Settings size={16} />
                      </button>
                </div>
                    </div>
                  </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Channel Header */}
              <div className="h-12 px-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <Hash size={24} className="text-gray-400" />
                  <span className="font-semibold">progress-pics</span>
                  <div className="h-6 w-[1px] bg-gray-600 mx-2" />
                  <span className="text-sm text-gray-400">Share your transformation journey and inspire others!</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-[#393C41] rounded-lg">
                    <Bell size={20} className="text-gray-400" />
                    </button>
                  <button className="p-2 hover:bg-[#393C41] rounded-lg">
                    <Pin size={20} className="text-gray-400" />
                    </button>
                  <button className="p-2 hover:bg-[#393C41] rounded-lg">
                    <Users size={20} className="text-gray-400" />
                    </button>
                  <input
                    type="text"
                    placeholder="Search"
                    className="px-3 py-1 bg-[#1E1F22] rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                  </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {/* Welcome Message */}
                <div className="text-center space-y-4 mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center">
                    <Camera size={40} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Welcome to #progress-pics!</h2>
                  <p className="text-gray-400 max-w-lg mx-auto">
                    This is the beginning of the #progress-pics channel. Share your transformation journey,
                    inspire others, and celebrate your progress together! 🎉
                  </p>
                          </div>
                          
                {/* Example Messages */}
                {[
                  {
                    name: 'Yi Long Ma',
                    time: '12:01',
                    message: 'Just hit a new PR today! 💪',
                    seed: 2,
                    avatar: {
                      url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
                      gradient: 'from-purple-500 to-pink-500'
                    },
                    media: {
                      type: 'image' as const,
                      url: '/gym/gym1.jpg',
                      alt: 'Gym workout achievement'
                    }
                  },
                  {
                    name: 'ynot',
                    time: '12:02',
                    message: 'Great progress everyone!',
                    seed: 3,
                    avatar: {
                      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                      gradient: 'from-blue-500 to-teal-500'
                    },
                    media: {
                      type: 'image' as const,
                      url: '/gym/gym2.jpg',
                      alt: 'Workout motivation'
                    }
                  },
                  {
                    name: 'zamzworldRoffe',
                    time: '12:03',
                    message: 'Check out my latest transformation pics',
                    seed: 4,
                    avatar: {
                      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
                      gradient: 'from-orange-500 to-red-500'
                    },
                    media: [
                      {
                        type: 'image' as const,
                        url: '/gym/gym3.jpg',
                        alt: 'Gym progress'
                      }
                    ]
                  }
                ].map((user, index) => (
                  <div key={index} className="flex flex-col gap-4 hover:bg-[#2E3035] p-2 rounded">
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full p-[2px] bg-gradient-to-br ${user.avatar.gradient}`}>
                        <img
                          src={user.avatar.url}
                          alt={`${user.name}'s avatar`}
                          className="w-full h-full rounded-full object-cover ring-2 ring-[#2B2D31]"
                        />
                      </div>
                      <div className="flex-1">
                                <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-gray-400">Today at {user.time}</span>
                                </div>
                        <p className="text-gray-300">{user.message}</p>
                              </div>
                            </div>
                    {/* Media Content */}
                    <div className="pl-14">
                      {Array.isArray(user.media) ? (
                        <div className="grid grid-cols-1 gap-2">
                          {user.media.map((media, mediaIndex) => (
                            <img
                              key={mediaIndex}
                              src={media.url}
                              alt={media.alt}
                              className="rounded-lg w-[400px] max-h-[300px] object-cover"
                            />
                          ))}
                                </div>
                      ) : user.media && (
                        <img
                          src={user.media.url}
                          alt={user.media.alt}
                          className="rounded-lg w-[400px] max-h-[300px] object-cover"
                        />
                      )}
                                </div>
                              </div>
                              ))}
                            </div>

              {/* Message Input */}
              <div className="px-4 pb-6">
                <div className="bg-[#383A40] rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#2E3035] rounded-full">
                      <Plus size={20} className="text-gray-200" />
                              </button>
                    <input
                      type="text"
                      placeholder="Message #progress-pics"
                      className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-400"
                    />
                    <button className="p-2 hover:bg-[#2E3035] rounded-full">
                      <Gift size={20} className="text-gray-200" />
                              </button>
                    <button className="p-2 hover:bg-[#2E3035] rounded-full">
                      <Sticker size={20} className="text-gray-200" />
                    </button>
                    <button className="p-2 hover:bg-[#2E3035] rounded-full">
                      <Smile size={20} className="text-gray-200" />
                              </button>
                          </div>
                        </div>
                      </div>
                    </div>

            {/* Members Sidebar */}
            <div className="w-60 bg-[#2B2D31] p-4">
              <div className="text-xs font-semibold text-gray-400 mb-4">MEMBERS — 128</div>
              
              {/* Online Members */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400 mb-2">ONLINE — 12</div>
                {[
                  'Roku', 'rossa', 'russia1488Magentabeats', 
                  'Maksym', 'man0101351', 'Max',
                  'Max', 'Miguel Angel', 'minatonamikaze7714',
                  'mitchellam Thomas', 'd33', 'charograssfed'
                ].map((member, index) => (
                  <div key={index} className="flex items-center gap-2 px-2 py-1 hover:bg-[#393C41] rounded cursor-pointer">
                    <div className="relative">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${index + 5}`}
                        alt="Member Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2B2D31]" />
                          </div>
                    <span className="text-gray-300">{member}</span>
                        </div>
                      ))}

                {/* Offline Members */}
                <div className="text-xs font-semibold text-gray-400 mt-4 mb-2">OFFLINE — 6</div>
                {[
                  'chill Man', 'chillin', 'chopStickSøn',
                  'cIément', 'con Dog', 'curiosity8519'
                ].map((member, index) => (
                  <div key={index} className="flex items-center gap-2 px-2 py-1 hover:bg-[#393C41] rounded cursor-pointer">
                    <div className="relative">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${index + 10}`}
                        alt="Member Avatar"
                        className="w-8 h-8 rounded-full opacity-70"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 rounded-full border-2 border-[#2B2D31]" />
                          </div>
                    <span className="text-gray-400">{member}</span>
                        </div>
                      ))}
              </div>
            </div>
          </div>
        );
      case 'virtual-try-on':
        return (
          <VirtualTryOn onBack={handleBack} />
        );
      default:
        return (
          <>
            <header className="fixed w-full backdrop-blur-lg bg-black/30 border-b border-gray-700 z-50">
              <div className="container mx-auto px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Replace the camera icon with your logo */}
                    <img src={logo} alt="Logo" className="w-8 h-8 md:w-12 md:h-12" style={{ marginTop: '-11px' }} />
                    <h1 className="text-2xl font-bold">Selfiemtrx</h1>
                  </div>
                  <nav className="hidden md:flex items-center space-x-8">
                    <button
                      onClick={handleHomeClick}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Home
                    </button>
                    <button
                      onClick={() => handleNavigation('features')}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Features
                    </button>
                    <button
                      onClick={() => handleNavigation('how-it-works')}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      How It Works
                    </button>
                    <button
                      onClick={() => handleAuthenticatedNavigation('community')}
                      className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-400/90 via-purple-400/90 to-fuchsia-400/90 rounded-full text-white transition-all hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                    >
                      {/* Static large overlapping sparkle */}
                      <div className="absolute -top-3 -right-3 pointer-events-none">
                        <Sparkles 
                          size={24} 
                          className="text-yellow-300/70"
                        />
                      </div>
                      
                      {/* Content wrapper */}
                      <div className="flex items-center gap-2 relative z-10">
                        <Users size={18} />
                        <span>Community</span>
                      </div>
                      
                      {/* Subtle hover glow */}
                      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-violet-400/20 via-purple-400/20 to-fuchsia-400/20 blur-md -z-10" />
                    </button>
                    <button
                      onClick={() => handleAuthenticatedNavigation('virtual-try-on')}
                      className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-400/90 via-indigo-400/90 to-violet-400/90 rounded-full text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-105"
                    >
                      {/* NEW text with stroke */}
                      <div className="absolute -top-3 -right-1 pointer-events-none">
                        <span className="text-xs font-medium tracking-wide text-white" style={{ textShadow: '-0.7px -0.7px 0 #000, 0.7px -0.7px 0 #000, -0.7px 0.7px 0 #000, 0.7px 0.7px 0 #000' }}>
                          NEW
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 relative z-10">
                        <Shirt size={18} />
                        <span>Virtual Try-On</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleAuthenticatedNavigation('bmi-calculator')}
                      className="px-4 py-2 bg-gradient-to-r from-pink-400/90 to-blue-400/90 rounded-full text-white transition-all hover:scale-105"
                    >
                      BMI Calculator
                    </button>
                  </nav>
                  <div className="md:flex items-center space-x-4">
                    {user ? (
                      <div className="relative" ref={userMenuRef}>
                        <button
                          onClick={() => setShowUserMenu(!showUserMenu)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all"
                        >
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt="Profile" 
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm">{user.displayName || user.email}</span>
                          <ChevronDown size={16} />
                        </button>

                        {showUserMenu && (
                          <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-900 rounded-xl shadow-xl border border-gray-700 backdrop-blur-lg">
                            <div className="px-4 py-2 border-b border-gray-700">
                              <p className="text-sm text-gray-400">Signed in as</p>
                              <p className="text-sm font-medium truncate">{user.email}</p>
                            </div>
                            
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                setCurrentView('profile');
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-gray-300"
                            >
                              <User size={16} />
                              <span>Profile</span>
                            </button>

                            <div className="border-t border-gray-700 my-2"></div>

                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                setCurrentView('upgrade');
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-blue-400"
                            >
                              <Crown size={16} />
                              <span>Upgrade Plan</span>
                            </button>

                            <div className="border-t border-gray-700 my-2"></div>

                            {/* Switch Account button */}
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                setShowLogin(true);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-gray-300"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <path d="M4 22h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2Z"/>
                                <path d="M14 2v4"/>
                                <path d="M8 2v4"/>
                                <path d="M2 10h18"/>
                                <path d="m7 14 3 3"/>
                                <path d="m10 14-3 3"/>
                              </svg>
                              <span>Switch Account</span>
                            </button>

                            <button
                              onClick={() => {
                                auth.signOut();
                                setShowUserMenu(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-center gap-2 text-gray-300"
                            >
                              <LogOut size={16} />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                        onClick={() => handleAuth('login')}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => handleAuth('signup')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all"
                      >
                        Get Started
                      </button>
                    </>
                  )}
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 hover:bg-white/10 rounded-lg"
                  >
                    <Menu size={24} />
                  </button>
                </div>
                {isMobileMenuOpen && (
                  <div className="md:hidden mt-4 py-4 border-t border-gray-700">
                    <nav className="flex flex-col space-y-4">
                      <button
                        onClick={() => {
                          handleHomeClick();
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Home
                      </button>
                      <button
                        onClick={() => {
                          handleNavigation('features');
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Features
                      </button>
                      <button
                        onClick={() => {
                          handleNavigation('how-it-works');
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        How It Works
                      </button>
                      <button
                        onClick={() => {
                          handleAuthenticatedNavigation('community');
                          setIsMobileMenuOpen(false);
                        }}
                        className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-400/90 via-purple-400/90 to-fuchsia-400/90 rounded-full text-white"
                      >
                        {/* Static large overlapping sparkle */}
                        <div className="absolute -top-3 -right-3 pointer-events-none">
                          <Sparkles 
                            size={24} 
                            className="text-yellow-300/70"
                          />
                        </div>
                        <div className="flex items-center gap-2 relative z-10">
                          <Users size={18} />
                          <span>Community</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleAuthenticatedNavigation('virtual-try-on');
                          setIsMobileMenuOpen(false);
                        }}
                        className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400/90 via-indigo-400/90 to-violet-400/90 rounded-full text-white"
                      >
                        <div className="flex items-center gap-2">
                          <Shirt size={18} />
                          <span>Virtual Try-On</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleAuth('login');
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => {
                          handleAuth('signup');
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all"
                      >
                        Get Started
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </header>

            <section
              className="relative min-h-screen flex items-center justify-center py-20 px-4 md:px-6"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"></div>
              <div className="relative container mx-auto text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent px-4 pb-3 leading-relaxed font-sfpro">
                  AI-Powered Attributes from Selfies & Images
                </h1>
                <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                  Instantly estimate height, weight, age, and object dimensions
                  using AI.<br />Just with your phone! 
                </p>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center">
                  <button
                    onClick={() => handleAuthenticatedNavigation('upload')}
                    className={`group flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-105 ${
                      highlightButtons ? 'animate-pulse border-blue-400 border-2' : ''
                    }`}
                  >
                    <Upload
                      size={24}
                      className="text-blue-400 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-lg">Upload Photo</span>
                  </button>
                  <button
                    onClick={() => handleAuthenticatedNavigation('camera')}
                    className={`group flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-105 ${
                      highlightButtons ? 'animate-pulse border-purple-400 border-2' : ''
                    }`}
                  >
                    <CameraIcon
                      size={24}
                      className="text-purple-400 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-lg">Take a Selfie</span>
                  </button>
                </div>
              </div>
            </section>

            <section ref={featuresRef} className="container mx-auto px-4 md:px-6 py-20">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {[
                  {
                    title: 'Height Estimation',
                    description: 'Get AI-powered height predictions from selfies',
                    icon: <Ruler size={40} className="text-blue-400" />,
                  },
                  {
                    title: 'Body & Age Analysis',
                    description: 'Estimate weight, age, and body dimensions',
                    icon: <Users size={40} className="text-purple-400" />,
                  },
                  {
                    title: 'Object Measurement',
                    description: 'Measure furniture, gadgets, and everyday objects',
                    icon: <Box size={40} className="text-pink-400" />,
                  },
                  {
                    title: 'Instant Results',
                    description: 'Just upload an image, and AI does the rest!',
                    icon: <Clock size={40} className="text-green-400" />,
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-gray-700 hover:bg-white/10 transition-all hover:scale-105"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-6 p-4 bg-white/5 rounded-full">
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="backdrop-blur-lg bg-black/30 border-t border-gray-700 mt-20">
              <div className="container mx-auto px-4 md:px-6 py-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4">Selfiemtrx</h3>
                    <p className="text-gray-400">
                      AI-Powered Measurement & Analysis
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">Quick Links</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li>
                        <button
                          onClick={handleHomeClick}
                          className="hover:text-white transition-colors"
                        >
                          Home
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleNavigation('features')}
                          className="hover:text-white transition-colors"
                        >
                          Features
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleNavigation('how-it-works')}
                          className="hover:text-white transition-colors"
                        >
                          How It Works
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleNavigation('privacy')}
                          className="hover:text-white transition-colors"
                        >
                          Privacy Policy
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">Contact</h4>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail size={16} />
                      <a
                        href="mailto:selfiemtrx@gmail.com"
                        className="hover:text-white transition-colors"
                      >
                        selfiemtrx@gmail.com
                      </a>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4">Follow Us</h4>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleSocialMedia('Instagram')}
                        className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <Instagram />
                      </button>
                      <button
                        onClick={() => handleSocialMedia('Twitter')}
                        className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <Twitter />
                      </button>
                      <button
                        onClick={() => handleSocialMedia('LinkedIn')}
                        className="text-gray-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <Linkedin />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
                  <p>&copy; {new Date().getFullYear()} Selfiemtrx. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </>
        );
    }
  };

  // Add useEffect to handle browser back button
  useEffect(() => {
    // Add current view to browser history
    window.history.pushState({ view: currentView }, '', '');

    // Handle browser back button
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
        // Scroll to top when returning to home page
        if (event.state.view === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // Reset states when going back
        setSelectedImage(null);
        setUploadProgress(0);
        setError(null);
        setAnalysisResult(null);
        setShowLogin(false);
        setShowSignUp(false);
        resetBMIStates();
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentView]);

  // Add a new useEffect to handle auth state changes
  useEffect(() => {
    if (user) {
      // Fetch user's subscription status
      const fetchSubscription = async () => {
        try {
          // First check paid_subscriptions collection
          const paidDocRef = doc(db, 'paid_subscriptions', user.uid);
          const paidDocSnap = await getDoc(paidDocRef);
          
          if (paidDocSnap.exists()) {
            const status = paidDocSnap.data().status;
            setUserSubscription(status);
            return;
          }

          // If no paid subscription, check subscriptions collection
          const docRef = doc(db, 'subscriptions', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const status = docSnap.data().status;
            setUserSubscription(status);
            return;
          }

          setUserSubscription('free');
        } catch (error) {
          console.error('Error fetching subscription:', error);
          setUserSubscription('free');
        }
      };

      // Add this new function call
      const fetchUserStats = async () => {
        try {
          const stats = await getUserStats(user.uid);
          setUserStats(stats);
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };

      fetchSubscription();
      fetchUserStats(); // Add this line

      if (showLogin || showSignUp) {
        setShowLogin(false);
        setShowSignUp(false);
        
        if (previousView !== 'home') {
          setCurrentView(previousView);
          setPreviousView('home');
        }
      }
    } else {
      setUserSubscription('free');
      setSelectedModel('free');
      setUserStats(null); // Add this line
    }
  }, [user, previousView]);

  // Add useEffect for click outside handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    // Add event listener when menu is open
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // First, create a products array outside of your component
  const skinCareProducts = [
    {
      id: 1,
      name: "LAKMÉ Forever Matte Radiant Liquid",
      description: "Perfect matte finish for your skin type",
      image: "https://m.media-amazon.com/images/I/41lxB1R1yAL._SL1000_.jpg",
      link: "https://amzn.in/d/0Uy7GVy"
    },
    {
      id: 2,
      name: "Minimalist Barrier Repair Moisturizer",
      description: "For dehydrated skin & damaged barrier repair",
      image: "https://m.media-amazon.com/images/I/51Sy8ktByyL._SL1500_.jpg",
      link: "https://amzn.in/d/i0s4RDb"
    },
    {
      id: 3,
      name: "The Derma Co Hyaluronic Sunscreen",
      description: "1% Hyaluronic protection for your skin",
      image: "https://m.media-amazon.com/images/I/51x3cj+-iUL._SL1200_.jpg",
      link: "https://amzn.in/d/8SmsBJy"
    },
    {
      id: 4,
      name: "Garnier Skin Naturals",
      description: "Gentle cleansing water for all skin types",
      image: "https://m.media-amazon.com/images/I/41yAKxKqv4L._SL1100_.jpg",
      link: "https://amzn.in/d/5OoEUb5"
    },
    {
      id: 5,
      name: "Maybelline Fit Me Compact",
      description: "Perfect finish compact powder",
      image: "https://m.media-amazon.com/images/I/61FDV10Re5L._SL1200_.jpg",
      link: "https://amzn.in/d/gDvPGxy"
    },
    {
      id: 6,
      name: "Minimalist Skin Brightening Serum",
      description: "Advanced formula for uneven skin tone",
      image: "https://m.media-amazon.com/images/I/619yc3aM31L._SL1500_.jpg",
      link: "https://amzn.in/d/i19Vbh6"
    },
    {
      id: 7,
      name: "Mamaearth Vitamin C Serum",
      description: "For skin brightening and glow",
      image: "https://m.media-amazon.com/images/I/51zZo49wleL._SL1201_.jpg",
      link: "https://amzn.in/d/0O5YLue"
    },
    {
      id: 8,
      name: "Simple Kind To Skin Face Wash",
      description: "Gentle cleansing for sensitive skin",
      image: "https://m.media-amazon.com/images/I/51lV2Pem64L._SL1000_.jpg",
      link: "https://amzn.in/d/8LTpq4J"
    },
    {
      id: 9,
      name: "Plum Green Tea Toner",
      description: "Alcohol-free toner for oil control",
      image: "https://m.media-amazon.com/images/I/41DmCFHRpGL._SL1001_.jpg",
      link: "https://amzn.in/d/iNhMUNY"
    },
    // Adding the new products
    {
      id: 10,
      name: "Plum Simply Bright Face Wash",
      description: "2% Niacinamide Face Wash with Rice Water",
      image: "https://m.media-amazon.com/images/I/41cfceQQphL.SL1000.jpg",
      link: "https://amzn.in/d/jfqZI95"
    },
    {
      id: 11,
      name: "L'Oreal Paris Hair Serum",
      description: "Protection and Shine for Dry, Flyaway & Frizzy Hair",
      image: "https://m.media-amazon.com/images/I/318VGkdEkZL.SX300_SY300_QL70_FMwebp.jpg",
      link: "https://amzn.in/d/0NF1QZi"
    },
    {
      id: 12,
      name: "KLOY Ice Roller",
      description: "For Puffy Eyes and Facial Skin Care",
      image: "https://m.media-amazon.com/images/I/71c+tpccv2L.SL1500.jpg",
      link: "https://amzn.in/d/3ORhXbc"
    }
  ];

  // Add this function to your component
  function getRandomProducts(products: typeof skinCareProducts, count: number) {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Then in your component, add a state for the random products
  const [randomProducts, setRandomProducts] = useState<typeof skinCareProducts>([]);

  // Add this before the return statement in the community case
  const [currentChannel, setCurrentChannel] = useState('progress-pics');

  const channels: Record<string, ChannelContent> = {
    'progress-pics': {
      id: '1',
      name: 'progress-pics',
      description: 'Share your transformation journey and inspire others!',
      posts: [
        {
          name: 'Yi Long Ma',
          time: '12:01',
          message: 'Just hit a new PR today! 💪',
          avatar: {
            url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
            gradient: 'from-purple-500 to-pink-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym1.jpg',
            alt: 'Gym workout achievement'
          }
        },
        {
          name: 'ynot',
          time: '12:02',
          message: 'Great progress everyone!',
          avatar: {
            url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
            gradient: 'from-blue-500 to-teal-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym2.jpg',
            alt: 'Workout motivation'
          }
        },
        {
          name: 'zamzworldRoffe',
          time: '12:03',
          message: 'Check out my latest transformation pics',
          avatar: {
            url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
            gradient: 'from-orange-500 to-red-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym3.jpg',
            alt: 'Gym progress'
          }
        }
      ]
    },
    'nutrition': {
      id: '2',
      name: 'nutrition',
      description: 'Share and discuss healthy meal plans and nutrition tips',
      posts: [
        {
          name: 'Max',
          time: '11:30',
          message: 'My meal prep for the week! High protein, low carb 🥗',
          avatar: {
            url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
            gradient: 'from-green-500 to-emerald-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym2.jpg',
            alt: 'Meal prep'
          }
        },
        {
          name: 'Miguel Angel',
          time: '10:45',
          message: 'Anyone tried this new protein shake? Tastes amazing!',
          avatar: {
            url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
            gradient: 'from-yellow-500 to-orange-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym1.jpg',
            alt: 'Protein shake'
          }
        }
      ]
    },
    'supplements': {
      id: '3',
      name: 'supplements',
      description: 'Discuss supplements, recommendations, and experiences',
      posts: [
        {
          name: 'Roku',
          time: '09:15',
          message: 'Best pre-workout supplements I\'ve tried so far 💪',
          avatar: {
            url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
            gradient: 'from-red-500 to-purple-500'
          },
          media: {
            type: 'image',
            url: '/gym/gym3.jpg',
            alt: 'Supplements collection'
          }
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {renderContent()}
      <ChatbaseWidget currentView={currentView} />
      {showLogin && (
        <Login
          onClose={() => {
            setShowLogin(false);
            setCurrentView('home');
          }}
          onSwitch={() => {
            setShowLogin(false);
            setShowSignUp(true);
          }}
        />
      )}
      {showSignUp && (
        <SignUp
          onClose={() => {
            setShowSignUp(false);
            setCurrentView('home');
          }}
          onSwitch={() => {
            setShowSignUp(false);
            setShowLogin(true);
          }}
        />
      )}
      {/* Show loading indicator while analyzing */}
      {isAnalyzing && (
        <div className="loading-indicator">
          Processing your request...
        </div>
      )}
      {/* Show result when available */}
      {results && !isAnalyzing && (
        <div className="result-container">
          {results}
        </div>
      )}
    </div>
  );
}

export default App;
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Info, Download, Camera, X, Sparkles, RefreshCw, Share2, Link, Copy, Check } from 'lucide-react';
import { tryOnGarment } from '../services/virtualTryOn';

interface VirtualTryOnProps {
  onBack: () => void;
}

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onBack }) => {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDraggingPerson, setIsDraggingPerson] = useState(false);
  const [isDraggingGarment, setIsDraggingGarment] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle camera stream when active
  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        setError('Error playing video stream');
        console.error('Error playing video:', err);
      });
    }
  }, [isCameraActive, stream]);

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
          setPersonImage(imageData);
        }
      } catch (err) {
        setError('Error capturing photo');
        console.error('Error taking photo:', err);
      }
    }
  };

  const handlePersonImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPersonImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGarmentImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setGarmentImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!personImage || !garmentImage) {
      setError('Please provide both a person image and a garment image');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const result = await tryOnGarment(personImage, garmentImage);
      if (!result) {
        throw new Error('No result received from the service');
      }
      setResult(result);
    } catch (err) {
      console.error('Error:', err);
      setError(
        err instanceof Error 
          ? `Error: ${err.message}. Please try again with different images or try later.` 
          : 'Failed to process images. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add copy to clipboard functionality
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Add share functionality
  const handleShare = async () => {
    if (result) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Virtual Try-On',
            text: 'Check out how this garment looks on me!',
            url: result
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Error sharing:', err);
            setShowShareMenu(true);
          }
        }
      } else {
        setShowShareMenu(true);
      }
    }
  };

  // Example image arrays
  const examplePersons = [
    '/examples/persons/person1.jpg',
    '/examples/persons/person2.jpg',
    '/examples/persons/person3.png',
    '/examples/persons/person4.jpg',
    '/examples/persons/person5.jpg'
  ];

  const exampleGarments = [
    '/examples/garments/garment1.png',
    '/examples/garments/garment2.jpg',
    '/examples/garments/garment3.jpg',
    '/examples/garments/garment4.jpg',
    '/examples/garments/garment5.png'
  ];

  // Handle drag events for person upload
  const handlePersonDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPerson(true);
  };

  const handlePersonDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPerson(false);
  };

  const handlePersonDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePersonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPerson(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handlePersonImageUpload(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  // Handle drag events for garment upload
  const handleGarmentDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGarment(true);
  };

  const handleGarmentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGarment(false);
  };

  const handleGarmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGarmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGarment(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleGarmentImageUpload(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Title with icon - now left aligned with max width container */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mt-6 mb-8">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Camera size={32} className="text-blue-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#ADA1F5]">Virtual Try-On</h1>
          </div>
        </div>

        {/* Main content */}
        <div className="backdrop-blur-lg bg-white/5 rounded-2xl border border-gray-700 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left side - Person Image */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-gradient-to-b from-[#6EA2FF] to-[#B988FF] rounded-full" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Your Photo</h2>
                    <p className="text-gray-400 text-sm">Please upload a photo of yourself standing straight</p>
                  </div>
                </div>
                
                <div 
                  className={`border-2 border-dashed ${
                    isDraggingPerson 
                      ? 'border-[#B988FF] bg-[#B988FF]/10' 
                      : 'border-white/10 hover:border-white/20'
                  } transition-colors rounded-xl p-4 group backdrop-blur-sm bg-black/20`}
                  onDragEnter={handlePersonDragEnter}
                  onDragLeave={handlePersonDragLeave}
                  onDragOver={handlePersonDragOver}
                  onDrop={handlePersonDrop}
                >
              {personImage ? (
                    <div className="relative group">
                      <div className="aspect-[3/4] relative">
                  <img 
                    src={personImage} 
                    alt="Person" 
                          className="absolute inset-0 w-full h-full object-contain mx-auto rounded-lg shadow-lg transition-transform"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                      <button 
                        onClick={() => {
                          setPersonImage(null);
                          setError(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-slate-800/70 rounded-full hover:bg-slate-700/70 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          setPersonImage(null);
                          setError(null);
                          startCamera();
                        }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                      >
                        <Camera size={20} />
                        Take Another Photo
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    <div className="text-center">
                      <div className="relative max-w-md mx-auto">
                        <div className="aspect-[3/4] relative rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                          />
                          <div className="absolute inset-0 border-4 border-slate-600/50 rounded-lg pointer-events-none animate-pulse" />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-center gap-4">
                        <button
                          onClick={takePhoto}
                          className="px-6 py-3 bg-black/40 hover:bg-black/60 rounded-lg transition-all flex items-center gap-2 hover:scale-105 border border-white/10"
                        >
                          <Camera size={20} />
                          Take Photo
                        </button>
                  <button 
                          onClick={stopCamera}
                          className="px-6 py-3 bg-red-500/10 text-red-200 rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-2 border border-red-500/20"
                  >
                          <X size={20} />
                          Cancel
                  </button>
                      </div>
                </div>
              ) : (
                    <div className="text-center py-12 px-4">
                      <div className="flex flex-col items-center gap-6">
                        <div className={`w-20 h-20 rounded-full ${
                          isDraggingPerson 
                            ? 'bg-blue-500/30 scale-110' 
                            : 'bg-slate-700/30'
                          } flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Upload size={32} className={`${
                            isDraggingPerson ? 'text-blue-400' : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-slate-200">Choose Your Photo</h3>
                          <p className="text-slate-400 text-sm">
                            {isDraggingPerson ? 'Drop your image here' : 'Drop your image here or click to browse'}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handlePersonImageUpload(e.target.files[0])}
                    className="hidden"
                    id="person-upload"
                  />
                  <label 
                    htmlFor="person-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-black/40 hover:bg-black/60 rounded-lg transition-all hover:scale-105 border border-white/10"
                  >
                    <Upload size={20} />
                    Upload Photo
                  </label>
                          <div className="flex items-center gap-3">
                            <div className="h-px w-4 bg-white/10" />
                            <span className="text-gray-400">or</span>
                            <div className="h-px w-4 bg-white/10" />
                          </div>
                          <button
                            onClick={startCamera}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black/40 hover:bg-black/60 rounded-lg transition-all hover:scale-105 border border-white/10"
                          >
                            <Camera size={20} />
                            Take a Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-red-200 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <Info size={24} className="flex-shrink-0 mt-1" />
                      <p>{error}</p>
                    </div>
                </div>
              )}

              {/* Example Photos */}
              <div className="mt-6">
                <p className="text-gray-400 text-sm mb-3">Or choose from examples:</p>
                <div className="grid grid-cols-5 gap-3">
                  {examplePersons.map((src, index) => (
                    <button
                      key={index}
                      onClick={() => setPersonImage(src)}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden group"
                    >
                      <img
                        src={src}
                        alt={`Example person ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="absolute bottom-2 left-2 text-xs text-white">
                          Example {index + 1}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
            </div>
          </div>

          {/* Right side - Garment Upload */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-gradient-to-b from-[#6EA2FF] to-[#B988FF] rounded-full" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Upload Garment</h2>
                    <p className="text-gray-400 text-sm">Upload the garment image you want to try on</p>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed ${
                    isDraggingGarment 
                      ? 'border-[#B988FF] bg-[#B988FF]/10' 
                      : 'border-white/10 hover:border-white/20'
                  } transition-colors rounded-xl p-4 group backdrop-blur-sm bg-black/20`}
                  onDragEnter={handleGarmentDragEnter}
                  onDragLeave={handleGarmentDragLeave}
                  onDragOver={handleGarmentDragOver}
                  onDrop={handleGarmentDrop}
                >
              {garmentImage ? (
                    <div className="relative group">
                      <div className="aspect-[3/4] relative">
                  <img 
                    src={garmentImage} 
                    alt="Garment" 
                          className="absolute inset-0 w-full h-full object-contain mx-auto rounded-lg shadow-lg transition-transform"
                  />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <button 
                    onClick={() => setGarmentImage(null)}
                        className="absolute top-2 right-2 p-2 bg-slate-800/70 rounded-full hover:bg-slate-700/70 transition-all opacity-0 group-hover:opacity-100"
                  >
                        <X size={20} />
                  </button>
                </div>
              ) : (
                    <div className="text-center py-12 px-4">
                      <div className="flex flex-col items-center gap-6">
                        <div className={`w-20 h-20 rounded-full ${
                          isDraggingGarment 
                            ? 'bg-blue-500/30 scale-110' 
                            : 'bg-slate-700/30'
                          } flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Upload size={32} className={`${
                            isDraggingGarment ? 'text-blue-400' : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-slate-200">Choose Garment</h3>
                          <p className="text-slate-400 text-sm">
                            {isDraggingGarment ? 'Drop your image here' : 'Drop your image here or click to browse'}
                          </p>
                        </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleGarmentImageUpload(e.target.files[0])}
                    className="hidden"
                    id="garment-upload"
                  />
                  <label 
                    htmlFor="garment-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all hover:scale-105"
                  >
                    <Upload size={20} />
                    Upload Garment
                  </label>
                      </div>
                </div>
              )}

              {/* Example Garments */}
              <div className="mt-6">
                <p className="text-gray-400 text-sm mb-3">Or choose from examples:</p>
                <div className="grid grid-cols-5 gap-3">
                  {exampleGarments.map((src, index) => (
                    <button
                      key={index}
                      onClick={() => setGarmentImage(src)}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden group"
                    >
                      <img
                        src={src}
                        alt={`Example garment ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="absolute bottom-2 left-2 text-xs text-white">
                          Example {index + 1}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Try On Button */}
            <div className="mt-12 text-center">
          <button
            onClick={handleTryOn}
            disabled={!personImage || !garmentImage || isLoading}
            className={`group relative px-8 py-4 rounded-full font-semibold transition-all ${
              isLoading 
                    ? 'bg-slate-600/50 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-[#6366F1] to-[#9333EA] hover:opacity-90 hover:scale-105'
                }`}
              >
                <span className="flex items-center gap-2 justify-center">
                  {isLoading ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="group-hover:animate-pulse" />
                      Try On Garment
                    </>
                  )}
                </span>
          </button>
        </div>

        {/* Results */}
        {result && (
              <div className="mt-12 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 bg-gradient-to-b from-[#6EA2FF] to-[#B988FF] rounded-full" />
                  <h2 className="text-xl font-semibold text-white">Generated Result</h2>
                </div>
                <div className="backdrop-blur-xl bg-black/20 rounded-xl border border-white/10 p-6 shadow-2xl">
                  <div className="aspect-[4/3] relative">
              <img 
                src={result} 
                alt="Try On Result" 
                      className="absolute inset-0 w-full h-full object-contain mx-auto rounded-lg shadow-2xl"
                onError={() => setError('Failed to load the result image. Please try again.')}
              />
                  </div>
                  <div className="mt-6 flex justify-center gap-4">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = result;
                    link.download = 'virtual-try-on-result.jpg';
                    link.click();
                  }}
                      className="px-6 py-3 bg-black/40 hover:bg-black/60 rounded-lg transition-all flex items-center gap-2 hover:scale-105 border border-white/10"
                >
                  <Download size={20} />
                  Download Result
                    </button>
                    <div className="relative">
                      <button
                        onClick={handleShare}
                        className="px-6 py-3 bg-black/40 hover:bg-black/60 rounded-lg transition-all flex items-center gap-2 hover:scale-105 border border-white/10"
                      >
                        <Share2 size={20} />
                        Share Result
                      </button>
                      
                      {showShareMenu && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/80 backdrop-blur-xl rounded-lg shadow-xl border border-white/10 p-2 animate-fade-in">
                          <div className="relative">
                            <button
                              onClick={() => copyToClipboard(result)}
                              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-white/5 rounded transition-colors text-left"
                            >
                              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                            </button>
                            <button
                              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(result)}&text=${encodeURIComponent('Check out my virtual try-on!')}`, '_blank')}
                              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-white/5 rounded transition-colors text-left"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                              Share on X
                            </button>
                            <button
                              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(result)}`, '_blank')}
                              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-white/5 rounded transition-colors text-left"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              Share on Facebook
                </button>
                <button
                              onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(result)}`, '_blank')}
                              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-white/5 rounded transition-colors text-left"
                >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                              Share on LinkedIn
                </button>
                            <div 
                              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-700 transform rotate-45"
                            />
                          </div>
                        </div>
                      )}
                    </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOn; 
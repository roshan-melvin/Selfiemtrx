import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';

const GoogleSignIn = () => {
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      await signInWithPopup(auth, provider);
      // Handle successful sign-in
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="mt-4 w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
    >
      <img 
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
        alt="Google" 
        className="w-5 h-5" 
      />
      Sign in with Google
    </button>
  );
};

export default GoogleSignIn; 
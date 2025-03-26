import { useState } from 'react';
import { auth } from '../firebase/config';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  // Get the oobCode from the URL
} 
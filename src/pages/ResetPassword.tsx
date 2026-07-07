import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ResetPassword — The password reset flow has been consolidated into ForgotPassword.tsx
 * (email → OTP → new password, all on one page). This component simply redirects there.
 */
const ResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/forgot-password', { replace: true });
  }, [navigate]);

  return null;
};

export default ResetPassword;

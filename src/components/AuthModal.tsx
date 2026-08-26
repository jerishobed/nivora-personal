import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAsDemo
} from '../lib/firebase';
import { X, Sparkles, Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Unable to sign in with Google. Please try email login or demo mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      if (mode === 'signup') {
        await registerWithEmail(email, password, displayName.trim() || undefined);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Try signing in.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await loginAsDemo();
      onClose();
    } catch (err: any) {
      console.error('Demo Login Error:', err);
      setErrorMsg('Unable to start demo mode. Please try signing in with Google or Email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-md p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-[16px] bg-[#7b4a27] text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            N
          </div>
          <h3 className="text-2xl font-bold text-[#1f1b18]">
            {mode === 'signin' ? 'Welcome Back to NIVORA' : 'Create Your NIVORA Account'}
          </h3>
          <p className="text-xs sm:text-sm text-[#756b63] mt-1">
            {mode === 'signin'
              ? 'Access your private journal, finances & AI assistant.'
              : 'Start your private personal intelligence journey.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-[14px] bg-[#fff5f5] border border-[#fecaca] text-[#991b1b] text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Auth Button */}
        <button
          id="google-signin-btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[14px] border border-[#dfd3c7] bg-[#fffdfb] hover:bg-[#eee7de] text-[#1f1b18] font-medium text-sm transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.37 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e8ddd2]" />
          </div>
          <div className="relative flex justify-center text-xs text-[#756b63]">
            <span className="bg-white px-3">or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#756b63] mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#756b63] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#756b63] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#756b63] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#756b63] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#756b63] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white font-medium text-sm transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Mode Button */}
        <div className="mt-4 pt-4 border-t border-[#e8ddd2] text-center">
          <button
            id="demo-signin-btn"
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#7b4a27] hover:text-[#63391d] bg-[#f3e8dc]/60 hover:bg-[#f3e8dc] px-3.5 py-2 rounded-full transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Mode (Try without signing up)</span>
          </button>
        </div>

        {/* Switch mode */}
        <div className="mt-4 text-center">
          {mode === 'signin' ? (
            <p className="text-xs text-[#756b63]">
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className="font-semibold text-[#7b4a27] hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#756b63]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className="font-semibold text-[#7b4a27] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

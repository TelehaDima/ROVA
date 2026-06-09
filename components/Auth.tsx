import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { Lock, Mail, Loader2, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  language: Language;
  isRecoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

const Auth: React.FC<AuthProps> = ({ language, isRecoveryMode = false, onRecoveryComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  
  // Password Recovery States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetEmailSent, setIsResetEmailSent] = useState(false);

  const t = TRANSLATIONS[language];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setCheckEmail(false);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setErrorMsg(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setIsResetEmailSent(true);
    } catch (error: any) {
      setErrorMsg(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (onRecoveryComplete) onRecoveryComplete();
      // Optional: show a success message or just let the main app render
    } catch (error: any) {
      setErrorMsg(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-md mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"></div>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
             <Lock className="text-white w-8 h-8" />
          </div>
        </div>
        
        {isRecoveryMode ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">
              {t.authUpdatePassword}
            </h2>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                placeholder={t.authPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-black/20 border border-white/10 text-white placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            {errorMsg && (
              <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              {t.authSaveNewPassword}
            </button>
          </form>
        ) : isForgotPassword ? (
          isResetEmailSent ? (
            <div className="text-center space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                <Mail className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-emerald-100 font-medium">
                  {t.authResetEmailSent}
                </p>
              </div>
              <button
                onClick={() => { setIsForgotPassword(false); setIsResetEmailSent(false); }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                {t.authBackToLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">
                {t.authResetPassword}
              </h2>
              <p className="text-slate-400 text-center mb-8 text-sm">
                {t.appTitle}
              </p>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder={t.authEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/20 border border-white/10 text-white placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              {errorMsg && (
                <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {errorMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                {t.authSendResetLink}
              </button>
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  {t.authBackToLogin}
                </button>
              </div>
            </form>
          )
        ) : checkEmail ? (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">
              Реєстрація успішна
            </h2>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <Mail className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-100 font-medium">
                {t.authConfirmEmail}
              </p>
            </div>
            <button
              onClick={() => { setCheckEmail(false); setIsRegister(false); }}
              className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
            >
              {t.authSwitchToLogin}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">
              {isRegister ? t.authRegisterBtn : t.authLoginBtn}
            </h2>
            <p className="text-slate-400 text-center mb-8 text-sm">
              {t.appTitle}
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder={t.authEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.authRequiredField)}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  required
                  className="w-full bg-black/20 border border-white/10 text-white placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder={t.authPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t.authRequiredField)}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  required
                  minLength={6}
                  className="w-full bg-black/20 border border-white/10 text-white placeholder:text-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />)}
                {isRegister ? t.authRegisterBtn : t.authLoginBtn}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
                className="block w-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                {isRegister ? t.authSwitchToLogin : t.authSwitchToRegister}
              </button>
              
              {!isRegister && (
                <button
                  onClick={() => { setIsForgotPassword(true); setErrorMsg(null); }}
                  className="block w-full text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  {t.authForgotPassword}
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;

import { useState } from 'react';
import { X, Scale, Loader2, Zap } from 'lucide-react';
import { signIn, signUp, signInWithGoogle } from '../lib/auth';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AuthGate = ({ onAuth, onGoToAuth }) => {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        await signIn(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      onAuth();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Gradient header bar */}
        <div
          className="h-1.5 w-full"
          style={{
            background: 'linear-gradient(90deg, #7C3AED, #5B21B6, #4C1D95, #7C3AED)',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 4s ease infinite',
          }}
        />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Zap size={17} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">You've hit the free limit</h3>
                <p className="text-[12px] text-text-tertiary mt-0.5">Sign up free to keep chatting with Gavin</p>
              </div>
            </div>
          </div>

          {/* Feature bullets */}
          <div className="flex gap-4 mb-5 bg-bg-primary rounded-xl p-3">
            {['Unlimited chat', 'Flashcards & quizzes', 'Study planner'].map(f => (
              <div key={f} className="flex-1 text-center">
                <p className="text-[11px] text-text-tertiary leading-tight">{f}</p>
              </div>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {['signup', 'signin'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                  mode === m
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border bg-bg-primary text-text-secondary hover:border-accent-primary/40'
                }`}>
                {m === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 h-10 border border-border rounded-xl bg-bg-primary hover:bg-bg-tertiary text-text-primary text-[13px] font-medium transition-all mb-3">
            <GoogleIcon /> Continue with Google
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full h-10 bg-bg-primary border border-border rounded-xl px-3 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full h-10 bg-bg-primary border border-border rounded-xl px-3 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 transition-colors"
            />

            {error && (
              <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={!email.trim() || !password.trim() || isLoading}
              className="w-full h-10 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2">
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              {mode === 'signup' ? 'Create Free Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;

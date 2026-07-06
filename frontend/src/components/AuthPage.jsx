import { useState, useEffect } from 'react';
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react';

const LAW_QUOTES = [
  { text: "The good of the people is the greatest law.", author: "Marcus Tullius Cicero" },
  { text: "Injustice anywhere is a threat to justice everywhere.", author: "Martin Luther King Jr." },
  { text: "The law is reason, free from passion.", author: "Aristotle" },
  { text: "Justice delayed is justice denied.", author: "William E. Gladstone" },
  { text: "Fiat justitia ruat caelum — Let justice be done though the heavens fall.", author: "Legal Maxim" },
  { text: "No man is above the law and no man is below it.", author: "Theodore Roosevelt" },
  { text: "The first duty of society is justice.", author: "Alexander Hamilton" },
  { text: "Ignorantia juris non excusat — Ignorance of the law excuses no one.", author: "Legal Maxim" },
  { text: "It is better that ten guilty persons escape than that one innocent suffer.", author: "William Blackstone" },
  { text: "Law and justice are not always the same.", author: "Gloria Steinem" },
  { text: "Audi alteram partem — Hear the other side.", author: "Legal Maxim" },
  { text: "The law must be stable, but it must not stand still.", author: "Roscoe Pound" },
];

const QuoteCarousel = () => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * LAW_QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % LAW_QUOTES.length);
        setVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const quote = LAW_QUOTES[idx];

  return (
    <div
      className="absolute bottom-8 left-8 right-8 z-10 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="border-l-2 border-white/30 pl-4">
        <p className="text-zinc-100 text-[13px] leading-relaxed italic mb-1.5">
          "{quote.text}"
        </p>
        <p className="text-zinc-400 text-[11px] font-medium">— {quote.author}</p>
      </div>
    </div>
  );
};
import { signIn, signUp, signInWithGoogle } from '../lib/auth';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GradientPanel = () => (
  <div
    className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden h-full"
    style={{
      background: 'linear-gradient(135deg, #0A0C10 0%, #18181B 30%, #27272A 60%, #3F3F46 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradient-shift 12s ease infinite',
    }}
  >
    {/* Floating orbs */}
    <div
      className="absolute w-72 h-72 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        top: '-5%', right: '-10%',
        animation: 'orb-float 7s ease-in-out infinite',
      }}
    />
    <div
      className="absolute w-96 h-96 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
        bottom: '10%', left: '-15%',
        animation: 'orb-float-slow 11s ease-in-out infinite',
      }}
    />
    <div
      className="absolute w-48 h-48 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        top: '40%', left: '30%',
        animation: 'orb-float 9s ease-in-out infinite 2s',
      }}
    />

    {/* Logo */}
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-9 h-9 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
        <Scale size={18} className="text-white" />
      </div>
      <span className="text-white text-[17px] font-semibold tracking-tight">Gavin AI</span>
    </div>

    {/* Tagline */}
    <div className="relative z-10">
      <h2 className="font-display text-4xl text-white leading-snug mb-4">
        Your Nigerian Law<br />Study Companion
      </h2>
      <p className="text-zinc-300 text-[14px] leading-relaxed max-w-xs">
        AI-powered legal study tools built for Nigerian law students — from RAG-powered Q&A to bar exam quizzes.
      </p>
      <div className="flex flex-wrap gap-2 mt-8 mb-20">
        {['RAG Legal Database', 'Bar Exam Quizzes', 'Study Planner'].map(tag => (
          <span key={tag} className="text-[11px] text-zinc-300 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>

    <QuoteCarousel />
  </div>
);

const AuthPage = ({ onAuth }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        setSuccess('Check your email to confirm your account, then sign in.');
        setMode('signin');
      } else {
        await signIn(email.trim(), password);
        onAuth();
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
    <div className="h-screen w-screen flex bg-bg-primary overflow-hidden">
      {/* Left — gradient panel (hidden on mobile) */}
      <div className="hidden lg:block lg:w-[42%] h-full">
        <GradientPanel />
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 bg-bg-primary overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center text-white">
              <Scale size={16} />
            </div>
            <span className="text-[15px] font-semibold text-text-primary">Gavin AI</span>
          </div>

          <h1 className="font-display text-[28px] text-text-primary mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-text-tertiary text-[14px] mb-8">
            {mode === 'signin'
              ? 'Enter your details to sign in to your account'
              : 'Start your Nigerian law journey for free'}
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 h-11 border border-border rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-[13px] font-medium transition-all mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full h-11 bg-bg-secondary border border-border rounded-xl px-4 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full h-11 bg-bg-secondary border border-border rounded-xl px-4 pr-11 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-[12px] text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg px-3 py-2">{success}</p>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password.trim() || isLoading}
              className="w-full h-11 bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/25"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-text-tertiary mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
              className="text-accent-primary hover:underline font-medium"
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

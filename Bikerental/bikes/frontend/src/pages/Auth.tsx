import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { authAPI, setAuthToken } from '@/lib/api';
import { SEO } from '@/components/SEO';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode !== 'signup');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Forgot Password Flow
    if (isForgotPassword) {
      setIsLoading(true);
      try {
        if (isResetting) {
          // Reset Password
          if (!resetToken || !formData.password) {
            toast({ title: "Error", description: "Please enter token and new password", variant: "destructive" });
            return;
          }
          await authAPI.resetPassword(resetToken, formData.password);
          toast({ title: "Success", description: "Password reset successfully! Please login." });
          setIsForgotPassword(false);
          setIsResetting(false);
          setResetToken('');
          setFormData(prev => ({ ...prev, password: '' }));
        } else {
          // Request Reset
          if (!formData.email) {
            toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
            return;
          }
          const res = await authAPI.forgotPassword(formData.email);
          toast({ title: "Success", description: res.message });
          if (res.devToken) {
            setResetToken(res.devToken);
            toast({ title: "Dev Mode", description: "Token pre-filled for testing" });
          }
          setIsResetting(true);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Normal Login/Signup Flow
    // Basic validation
    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !formData.name) {
      toast({
        title: "Error",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const data = await authAPI.login({ email: formData.email, password: formData.password });
        if (data?.token) setAuthToken(data.token);
        if (data?.user) localStorage.setItem('currentUser', JSON.stringify(data.user));
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
        // Redirect based on role
        if (data.user?.role === 'superadmin') {
          navigate('/superadmin');
        } else if (data.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        const data = await authAPI.register({ email: formData.email, password: formData.password, name: formData.name });
        if (data?.token) setAuthToken(data.token);
        if (data?.user) localStorage.setItem('currentUser', JSON.stringify(data.user));
        toast({
          title: "Success",
          description: "Account created successfully! Welcome bonus of ₹500 added to your wallet.",
        });
        // Redirect based on role
        if (data.user?.role === 'superadmin') {
          navigate('/superadmin');
        } else if (data.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderText = () => {
    if (isForgotPassword) {
      return isResetting ? 'Reset Password' : 'Forgot Password';
    }
    return isLogin ? 'Welcome back' : 'Create account';
  };

  const getSubHeaderText = () => {
    if (isForgotPassword) {
      return isResetting ? 'Enter the token and your new password' : 'Enter your email to receive a reset link';
    }
    return isLogin ? 'Enter your credentials to access your account' : 'Sign up to start renting bikes today';
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <SEO 
        title={isLogin ? "Login" : "Sign Up"}
        description={isLogin ? "Log in to your RideFlow account to manage your bookings and rentals." : "Create a new RideFlow account to start renting premium bikes today."}
        keywords="bike rental login, create account, RideFlow sign up, rental dashboard access"
        noindex={true}
      />
      <main className="flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16">
          <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 rounded-xl gradient-hero">
              <Bike className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">RideFlow</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">
              {getHeaderText()}
            </h1>
            <p className="text-muted-foreground">
              {getSubHeaderText()}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field - Only for Signup */}
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[a-zA-Z\s]*$/.test(value)) {
                      setFormData({ ...formData, name: value.slice(0, 50) });
                    }
                  }}
                  maxLength={50}
                />
              </div>
            )}

            {/* Email Field - Always visible unless resetting password */}
            {(!isForgotPassword || (isForgotPassword && !isResetting)) && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isResetting}
                />
              </div>
            )}

            {/* Token Field - Only for Resetting */}
            {isResetting && (
              <div className="space-y-2">
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Enter reset token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>
            )}

            {/* Password Field - Login, Signup, or Resetting */}
            {(!isForgotPassword || isResetting) && (
              <div className="space-y-2">
                <Label htmlFor="password">{isResetting ? 'New Password' : 'Password'}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link - Only on Login */}
            {isLogin && !isForgotPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading 
                ? 'Please wait...' 
                : isForgotPassword 
                  ? (isResetting ? 'Reset Password' : 'Send Reset Link')
                  : (isLogin ? 'Sign In' : 'Create Account')
              }
            </Button>
            
            {/* Back to Login from Forgot Password */}
            {isForgotPassword && (
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full mt-2" 
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsResetting(false);
                  setResetToken('');
                }}
              >
                Back to Login
              </Button>
            )}
          </form>

          {/* Toggle Login/Signup - Only when not in Forgot Password mode */}
          {!isForgotPassword && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
      </main>

      {/* Right side: Image/Content */}
      <div className="hidden lg:flex flex-1 gradient-dark items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
            <Bike className="h-12 w-12 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-display font-bold text-secondary-foreground mb-4">
            Start Your Journey
          </h2>
          <p className="text-muted-foreground">
            Join thousands of riders exploring their cities with RideFlow.
            Premium bikes, flexible rentals, unforgettable adventures.
          </p>

          {/* Feature List */}
          <div className="mt-8 space-y-4 text-left">
            {[
              'Access to 50+ premium bikes',
              'Digital wallet for easy payments',
              'Earn rewards on every ride',
              '24/7 customer support',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-secondary-foreground">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

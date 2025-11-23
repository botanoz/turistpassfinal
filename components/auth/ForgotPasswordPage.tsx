"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  ArrowLeft,
  Shield,
  CheckCircle2,
  RotateCcw,
  Send,
  Clock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSubmitted(true);
    
    // Start countdown for resend option
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setEmail("");
    setError("");
    setCountdown(0);
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    
    // Restart countdown
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green/5 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Back to Home</span>
              </Link>
            </div>
            
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-4">Password Reset Sent</h1>
                <p className="text-xl text-muted-foreground">
                  Check your email and follow the instructions to reset your password
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Email sent successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Link expires in 24 hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Secure password reset process</span>
                </div>
              </div>

              {/* Decorative Image */}
              <div className="relative h-64 rounded-lg overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop"
                  alt="Email sent"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Right Side - Success Message */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="shadow-xl text-center">
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    We&apos;ve sent a password reset link to:
                  </p>
                  <p className="font-medium text-primary bg-primary/10 py-2 px-4 rounded-lg">
                    {email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If you don&apos;t see the email in your inbox, please check your spam folder.
                  </p>
                </div>

                <div className="space-y-3">
                  {countdown > 0 ? (
                    <Button disabled className="w-full" variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Resend in {countdown}s
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleResendEmail} 
                      variant="outline" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Resend Email
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button onClick={handleTryAgain} variant="ghost" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Different Email
                  </Button>
                  
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Reset link expires in 24 hours for security
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-orange/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-4">Reset Your Password</h1>
              <p className="text-xl text-muted-foreground">
                Enter your email address and we&apos;ll send you a link to reset your password
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Secure password reset process</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Email sent instantly</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Reset link valid for 24 hours</span>
              </div>
            </div>

            {/* Decorative Image */}
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop"
                alt="Password reset"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Right Side - Reset Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Forgot Password?</CardTitle>
              <p className="text-sm text-muted-foreground">
                No worries! Enter your email and we&apos;ll send you a reset link.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Enter your email address"
                      className={`pl-10 ${error ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Back to Login */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Create one now
                  </Link>
                </p>
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Password reset links are secure and expire after 24 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
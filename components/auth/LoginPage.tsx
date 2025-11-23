"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  ArrowLeft,
  Shield,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const checkEmail = searchParams.get("checkEmail");
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (checkEmail) {
      toast.info("Hesabın oluşturuldu. Lütfen e-postanı kontrol ederek onayla.");
      router.replace("/login"); // kısa ömürlü parametreyi temizle
    }
  }, [checkEmail, router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session) {
        const accountType =
          (session.user.user_metadata?.account_type as string | undefined) ??
          "customer";
        router.replace(accountType === "business" ? "/business/dashboard" : redirectTo);
      }
    });
  }, [redirectTo, router, supabase]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.email) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      const accountType =
        (data.user?.user_metadata?.account_type as string | undefined) ??
        "customer";

      toast.success("Login successful! Welcome back.");
      router.push(accountType === "business" ? "/business/dashboard" : redirectTo);
    } catch (error: any) {
      console.error("Login error:", error);
      const message =
        error?.message?.includes("Invalid login credentials")
          ? "Invalid email or password."
          : error?.message || "Login failed. Please try again.";
      toast.error(message);
      setErrors({ email: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-blue/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-4">Welcome back to TuristPass</h1>
              <p className="text-xl text-muted-foreground">
                Sign in to access your passes and continue exploring Istanbul
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">
                  Access all your purchased passes
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">
                  Track your savings and usage
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">
                  Get personalized recommendations
                </span>
              </div>
            </div>

            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=400&fit=crop"
                alt="Istanbul"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Must contain at least 6 characters
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(value) =>
                        handleChange({
                          target: {
                            name: "rememberMe",
                            type: "checkbox",
                            checked: Boolean(value),
                          },
                        } as any)
                      }
                    />
                    Remember me
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <div>
                  İşletme hesabı için{" "}
                  <Link href="/business/login" className="text-primary hover:underline font-medium">
                    işletme girişi
                  </Link>{" "}
                  veya{" "}
                  <Link href="/business/apply" className="text-primary hover:underline font-medium">
                    işletme kaydı
                  </Link>
                  .
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>Demo access:</p>
                <p>
                  Email: demo@turistpass.com • Password: Demo123!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

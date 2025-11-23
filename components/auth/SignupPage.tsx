"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Shield,
  CheckCircle2,
  Gift,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    subscribeNewsletter: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const accountTypeFromMeta =
        (session?.user?.user_metadata?.account_type as string | undefined) ?? "customer";

      if (session) {
        router.replace(accountTypeFromMeta === "business" ? "/business/dashboard" : redirectTo);
      }
    });
  }, [router, supabase, redirectTo]);

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

    if (!formData.firstName.trim()) {
      nextErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = "Last name is required";
    }

    if (!formData.email) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      nextErrors.password = "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeToTerms) {
      nextErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}${redirectTo || "/"}` : redirectTo || "/";

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            account_type: "customer",
            subscribe_newsletter: formData.subscribeNewsletter,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.session) {
        toast.success("Hesap oluşturuldu. Lütfen e-postanı kontrol ederek onayla.");
        router.push("/login?checkEmail=1");
        return;
      }

      const accountTypeFromMeta = (data.user?.user_metadata?.account_type || "customer") as "business" | "customer";
      router.push(accountTypeFromMeta === "business" ? "/business/dashboard" : redirectTo);
    } catch (error: any) {
      console.error("Signup error:", error);
      const message =
        error?.message?.includes("already registered")
          ? "This email is already registered."
          : error?.message || "Signup failed. Please try again.";
      toast.error(message);
      setErrors((prev) => ({ ...prev, email: message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green/5 flex items-center justify-center p-4">
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
              <h1 className="text-4xl font-bold mb-4">Join TuristPass Today</h1>
              <p className="text-xl text-muted-foreground">
                Create your account and start exploring Istanbul with exclusive discounts
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Get 10% off your first pass</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Access 70+ partner locations</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Track your savings in real-time</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Secure payments and instant delivery</span>
              </div>
            </div>

            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&auto=format&fit=crop"
                alt="Istanbul Bosphorus"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sign up as a customer to start using TuristPass
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className={`pl-10 ${errors.firstName ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className={`pl-10 ${errors.lastName ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                  </div>
                </div>

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
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Must contain uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferences</label>
                  <div className="space-y-3 rounded-lg border p-4">
                    <label className="flex items-center gap-3">
                      <Checkbox
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(value) =>
                          handleChange({
                            target: {
                              name: "agreeToTerms",
                              type: "checkbox",
                              checked: Boolean(value),
                            },
                          } as any)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary underline">
                          Terms & Conditions
                        </Link>
                      </span>
                    </label>
                    {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}

                    <label className="flex items-center gap-3">
                      <Checkbox
                        name="subscribeNewsletter"
                        checked={formData.subscribeNewsletter}
                        onCheckedChange={(value) =>
                          handleChange({
                            target: {
                              name: "subscribeNewsletter",
                              type: "checkbox",
                              checked: Boolean(value),
                            },
                          } as any)
                        }
                      />
                      <span className="text-sm text-muted-foreground">Subscribe to the TuristPass newsletter</span>
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <div>
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Log in
                  </Link>
                </div>
                <div className="text-xs">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  CheckCircle2,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BusinessApplyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    category: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    district: "",
    customDistrict: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const categories = [
    "Historical",
    "Museum",
    "Restaurant",
    "Cafe",
    "Spa & Massage",
    "Shopping",
    "Activity",
    "Beauty",
    "Auto Service"
  ];

  const districts = [
    "Sultanahmet",
    "Beyoğlu",
    "Beşiktaş",
    "Kadıköy",
    "Üsküdar",
    "Taksim",
    "Galata",
    "Eminönü",
    "Other"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.district) {
      newErrors.district = "District is required";
    }

    if (formData.district === "Other" && !formData.customDistrict.trim()) {
      newErrors.customDistrict = "Please enter your district";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const finalDistrict = formData.district === "Other" ? formData.customDistrict : formData.district;

      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.businessName,
          email: formData.email,
          password: formData.password,
          categoryId: formData.category,
          contact: {
            phone: formData.phone,
            email: formData.email
          },
          location: {
            address: formData.address,
            district: finalDistrict,
            coordinates: { lat: 0, lng: 0 }
          }
        })
      });

      const result = await response.json();

      setIsLoading(false);

      if (result.success) {
        setIsSuccess(true);
        toast.success("Application submitted successfully!");
      } else {
        toast.error(result.error || "Application failed. Please try again.");
        setErrors({ email: result.error || "Failed to submit application" });
      }
    } catch (error: any) {
      setIsLoading(false);
      toast.error("Network error. Please try again.");
      console.error('Registration error:', error);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Application Submitted!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thank you for your interest in becoming a TuristPass partner. We&apos;ve received your application and will review it shortly.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm font-medium mb-2">What happens next?</p>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Our team will review your application within 2-3 business days</li>
                <li>• We&apos;ll contact you via email with next steps</li>
                <li>• You&apos;ll receive login credentials once approved</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/">Return to Home</Link>
              </Button>
              <Button asChild>
                <Link href="/business/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Column - Benefits */}
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
              <h1 className="text-4xl font-bold mb-4">Become a Partner</h1>
              <p className="text-xl text-muted-foreground">
                Join TuristPass and reach thousands of tourists visiting Istanbul
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Reach thousands of tourists</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">QR code validation system</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Business dashboard and analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Marketing support and promotion</span>
              </div>
            </div>

            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop"
                alt="Istanbul Business"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Application Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Partner Application</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fill out the form to join TuristPass
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="Your business name"
                      className={`pl-10 ${errors.businessName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.businessName && (
                    <p className="text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, category: value }));
                      if (errors.category) setErrors(prev => ({ ...prev, category: "" }));
                    }}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category}</p>
                  )}
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
                      placeholder="contact@business.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
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
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+90 212 123 4567"
                      className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full business address"
                    className={`pl-10 ${errors.address ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address}</p>
                )}
              </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">District</label>
                  <Select
                    value={formData.district}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, district: value }));
                      if (errors.district) setErrors(prev => ({ ...prev, district: "" }));
                    }}
                  >
                    <SelectTrigger className={errors.district ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((dist) => (
                        <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.district && (
                    <p className="text-sm text-red-500">{errors.district}</p>
                  )}
                </div>

                {formData.district === "Other" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter District Name</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="customDistrict"
                        value={formData.customDistrict}
                        onChange={handleChange}
                        placeholder="Enter your district"
                        className={`pl-10 ${errors.customDistrict ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.customDistrict && (
                      <p className="text-sm text-red-500">{errors.customDistrict}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/business/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


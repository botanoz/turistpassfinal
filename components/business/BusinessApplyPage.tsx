"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { businessAuthService } from "@/lib/services/businessAuthService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BusinessApplyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    category: "",
    email: "",
    phone: "",
    address: "",
    district: "",
    description: "",
    discount: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const categories = [
    "Museum",
    "Restaurant",
    "Cafe",
    "Shopping",
    "Entertainment",
    "Tour",
    "Hotel",
    "Spa & Wellness",
    "Transportation",
    "Other"
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

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.district) {
      newErrors.district = "District is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Business description is required";
    }

    if (!formData.discount.trim()) {
      newErrors.discount = "Discount offer is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    const result = await businessAuthService.register({
      name: formData.businessName,
      email: formData.email,
      categoryId: formData.category,
      contact: {
        phone: formData.phone,
        email: formData.email
      },
      location: {
        address: formData.address,
        district: formData.district,
        coordinates: { lat: 0, lng: 0 }
      },
      description: formData.description,
      discount: formData.discount
    });

    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      toast.success("Application submitted successfully!");
    } else {
      toast.error(result.error || "Application failed. Please try again.");
      setErrors({ email: result.error || "Failed to submit application" });
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Become a Partner</h1>
            <p className="text-muted-foreground">Join TuristPass and reach thousands of tourists</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Partner Application Form</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill out the form below to apply. We&apos;ll review your application and get back to you within 2-3 business days.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name *</label>
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
                  <label className="text-sm font-medium">Category *</label>
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Email *</label>
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
                  <label className="text-sm font-medium">Phone Number *</label>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Address *</label>
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
                <label className="text-sm font-medium">District *</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Business Description *</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell us about your business, what makes it special..."
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Offer for TuristPass Users *</label>
                <Input
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="e.g., 20% off all menu items"
                  className={errors.discount ? 'border-red-500' : ''}
                />
                {errors.discount && (
                  <p className="text-sm text-red-500">{errors.discount}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/business/login">
                    Already have an account?
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

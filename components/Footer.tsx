"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Code, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { footerData } from "@/lib/mockData/footerData";
import { getContactInfo, type ContactInfo } from "@/lib/services/settingsService";

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [year, setYear] = useState(2024);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load contact information from database
  useEffect(() => {
    async function loadContactInfo() {
      try {
        const info = await getContactInfo();
        setContactInfo(info);
      } catch (error) {
        console.error('Error loading contact info for footer:', error);
        setContactInfo(null);
      } finally {
        setLoading(false);
      }
    }

    loadContactInfo();
  }, []);

  useEffect(() => {
    setYear(new Date().getFullYear());

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("footer");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !agreedToTerms) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(true);
      setIsSubmitting(false);
      setEmail("");
      setAgreedToTerms(false);
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }, 1000);
  }, [email, agreedToTerms]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handleTermsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreedToTerms(e.target.checked);
  }, []);

  return (
    <footer id="footer" className="relative bg-muted/50 overflow-hidden">
      {/* Newsletter Section - Primary Color Background */}
      <div className="relative bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/90" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className={`transition-all duration-700 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-white">
                {contactInfo?.newsletterTitle || footerData.newsletterInfo.title}
              </h3>
              <p className="text-lg text-primary-foreground/90 leading-relaxed">
                {contactInfo?.newsletterDescription || footerData.newsletterInfo.description}
              </p>
            </div>
            
            {/* Right Form */}
            <div className={`transition-all duration-700 delay-100 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              
              {isSubmitted ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 text-white">
                    <div className="bg-green-500 rounded-full p-2">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Thank you for subscribing!</h4>
                      <p className="text-sm text-primary-foreground/80">
                        You&apos;ll receive travel tips soon.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your e-mail address"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/95 backdrop-blur-sm border border-white/20 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 transition-all"
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={!email || !agreedToTerms || isSubmitting}
                      className="bg-white hover:bg-white/90 text-primary font-semibold px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group min-w-[120px]"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span>Sending...</span>
                        </div>
                      ) : (
                        <>
                          Subscribe
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Checkbox */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreedToTerms}
                      onChange={handleTermsChange}
                      className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-white focus:ring-white/30 focus:ring-offset-0"
                    />
                    <label 
                      htmlFor="agree-terms" 
                      className="text-sm text-primary-foreground/90 leading-relaxed cursor-pointer"
                    >
                      By signing up, you agree to receiving email updates in accordance with the Istanbul 
                      Tourist Pass&apos;s{" "}
                      <Link href="/privacy" className="text-white underline hover:no-underline">
                        privacy policy
                      </Link>
                      . We do not sell your personal data.
                    </label>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className={`lg:col-span-2 transition-all duration-700 delay-200 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <Link href="/" className="inline-block">
                <h3 className="text-2xl font-bold text-primary">{contactInfo?.siteName || footerData.brandInfo.name}</h3>
              </Link>
              <p className="mt-4 text-muted-foreground max-w-sm leading-relaxed">
                {contactInfo?.brandDescription || footerData.brandInfo.description}
              </p>
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <footerData.contactInfo.location.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{contactInfo ? `${contactInfo.officeCity}, ${contactInfo.officeCountry}` : footerData.contactInfo.location.text}</span>
                </div>
                <div className="flex items-center gap-3">
                  <footerData.contactInfo.email.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{contactInfo?.email || footerData.contactInfo.email.text}</span>
                </div>
                <div className="flex items-center gap-3">
                  <footerData.contactInfo.phone.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{contactInfo?.phone || footerData.contactInfo.phone.text}</span>
                </div>
              </div>
            </div>

            {/* Links Sections */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:col-span-3 gap-8 transition-all duration-700 delay-300 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div>
                <h4 className="font-semibold mb-4 text-foreground">Company</h4>
                <ul className="space-y-2">
                  {footerData.company.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-foreground">Product</h4>
                <ul className="space-y-2">
                  {footerData.product.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-foreground">Support</h4>
                <ul className="space-y-2">
                  {footerData.support.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50 bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {year} {contactInfo?.siteName || footerData.brandInfo.name}. All rights reserved.
            </div>
            
            {/* Botanozalp.com Signature */}
            <div className="flex items-center space-x-2 px-4 py-2 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Design & Code:</span>
              </div>
              <a 
                href="https://botanozalp.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 group"
              >
                <span className="text-primary font-bold text-sm">Botanozalp.com</span>
                <Sparkles className="h-3 w-3 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              {footerData.social.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
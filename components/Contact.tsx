"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Send,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Shield,
  Loader2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { contactData } from "@/lib/mockData/contactData";
import { getContactInfo, type ContactInfo } from "@/lib/services/settingsService";

// Simple Contact Form Component
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [mathAnswer, setMathAnswer] = useState("");
  const [isMathCorrect, setIsMathCorrect] = useState(false);

  // Generate new math challenge
  const generateMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 21); // 0-20
    const num2 = Math.floor(Math.random() * 21); // 0-20
    setMathChallenge({ num1, num2 });
    setMathAnswer("");
    setIsMathCorrect(false);
    setIsRobotVerified(false);
  };

  // Initialize math challenge on component mount
  useEffect(() => {
    generateMathChallenge();
  }, []);

  // Check math answer
  const handleMathAnswer = (value: string) => {
    setMathAnswer(value);
    const correctAnswer = mathChallenge.num1 + mathChallenge.num2;
    const userAnswer = parseInt(value);
    
    if (userAnswer === correctAnswer) {
      setIsMathCorrect(true);
      setIsRobotVerified(true);
    } else {
      setIsMathCorrect(false);
      setIsRobotVerified(false);
    }
  };
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isRobotVerified) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", phone: "", message: "" });
      setIsRobotVerified(false);
      generateMathChallenge();
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isSubmitted) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Message Sent!</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ll get back to you within 4 hours.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send us a Message</CardTitle>
        <p className="text-sm text-muted-foreground">
          We&apos;ll respond to your message within 4 hours.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>
          
          <div>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your email"
              required
            />
          </div>

          <div>
            <Input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Your phone number (optional)"
            />
          </div>

          <div>
            <Textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="How can we help you?"
              rows={4}
              required
            />
          </div>

          {/* Security Verification */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Security Verification</span>
            </div>
            
            {/* Math Challenge */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-lg font-mono bg-background border rounded-lg px-3 py-2">
                  <span className="text-primary font-bold">{mathChallenge.num1}</span>
                  <span className="text-muted-foreground">+</span>
                  <span className="text-primary font-bold">{mathChallenge.num2}</span>
                  <span className="text-muted-foreground">=</span>
                </div>
                
                <Input
                  type="number"
                  value={mathAnswer}
                  onChange={(e) => handleMathAnswer(e.target.value)}
                  placeholder="?"
                  className={`w-16 text-center font-mono ${
                    mathAnswer && (isMathCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                  }`}
                  min="0"
                  max="40"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateMathChallenge}
                  className="p-2"
                  title="Generate new challenge"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  isMathCorrect 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300'
                }`}>
                  {isMathCorrect && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span className={`text-sm transition-colors ${
                  isMathCorrect ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  {isMathCorrect ? 'Verification completed' : 'Please solve the math problem'}
                </span>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !isRobotVerified}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// FAQ Component
const FAQ = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-6">Frequently Asked Questions</h3>
      {contactData.quickFaqs.map((faq, index) => (
        <Card key={index}>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
          >
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium">{faq.question}</CardTitle>
              <ArrowRight className={`h-4 w-4 transition-transform ${openFaq === index ? 'rotate-90' : ''}`} />
            </div>
          </CardHeader>
          {openFaq === index && (
            <CardContent className="pt-0 pb-4">
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};

export default function ContactPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load contact information from database
  useEffect(() => {
    async function loadContactInfo() {
      try {
        setLoading(true);
        const info = await getContactInfo();
        setContactInfo(info);
      } catch (error) {
        console.error('Error loading contact info:', error);
        // Fallback to mock data if database fails
        setContactInfo(null);
      } finally {
        setLoading(false);
      }
    }

    loadContactInfo();
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.querySelector('#contact-page');
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (element && observerRef.current) {
        observerRef.current.unobserve(element);
      }
    };
  }, []);

  // Fallback to mock data if contact info not loaded
  const { hero, contactMethods, office, supportStats } = contactData;

  // Use database data if available, otherwise use mock data
  const displayData = contactInfo ? {
    hero: {
      badge: hero.badge,
      title: hero.title,
      subtitle: hero.subtitle
    },
    contactMethods: [
      {
        id: "whatsapp",
        icon: contactMethods[0].icon,
        title: "WhatsApp",
        description: contactInfo.whatsappDescription,
        value: contactInfo.whatsapp,
        link: contactInfo.whatsappUrl,
        availability: contactInfo.whatsappAvailability,
        color: contactMethods[0].color
      },
      {
        id: "phone",
        icon: contactMethods[1].icon,
        title: "Phone",
        description: contactInfo.phoneDescription,
        value: contactInfo.phone,
        link: `tel:${contactInfo.phone.replace(/\s/g, '')}`,
        availability: contactInfo.phoneAvailability,
        color: contactMethods[1].color
      },
      {
        id: "email",
        icon: contactMethods[2].icon,
        title: "Email",
        description: contactInfo.emailDescription,
        value: contactInfo.email,
        link: `mailto:${contactInfo.email}`,
        availability: contactInfo.emailResponseTime,
        color: contactMethods[2].color
      }
    ],
    office: {
      name: contactInfo.officeName,
      address: contactInfo.officeAddress,
      city: contactInfo.officeCity,
      country: contactInfo.officeCountry,
      phone: contactInfo.phone,
      email: contactInfo.email,
      whatsapp: contactInfo.whatsapp,
      hours: {
        weekdays: contactInfo.officeHoursWeekdays,
        weekend: contactInfo.officeHoursWeekend
      },
      coordinates: {
        lat: parseFloat(contactInfo.officeLatitude),
        lng: parseFloat(contactInfo.officeLongitude)
      },
      image: contactInfo.officeImageUrl
    },
    supportStats: [
      {
        number: contactInfo.supportResponseTime,
        label: "Response Time",
        icon: supportStats[0].icon
      },
      {
        number: contactInfo.supportSatisfactionRate,
        label: "Satisfaction Rate",
        icon: supportStats[1].icon
      },
      {
        number: contactInfo.supportHappyCustomers,
        label: "Happy Customers",
        icon: supportStats[2].icon
      },
      {
        number: contactInfo.supportWhatsappAvailable,
        label: "WhatsApp Support",
        icon: supportStats[3].icon
      }
    ]
  } : { hero, contactMethods, office, supportStats };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading contact information...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="contact-page" className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue/5" />
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              {displayData.hero.badge}
            </Badge>
            <h1 className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {displayData.hero.title}
            </h1>
            <p className={`text-lg text-muted-foreground max-w-2xl mx-auto transition-all duration-700 delay-200 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {displayData.hero.subtitle}
            </p>
          </div>

          {/* Support Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {displayData.supportStats.map((stat, index) => (
              <Card key={index} className={`text-center p-4 transition-all duration-700 delay-${300 + index * 100} transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-lg md:text-xl font-bold text-primary">{stat.number}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground">Choose the best way to reach us</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {displayData.contactMethods.map((method) => (
              <Card key={method.id} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center mb-4`}>
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                  
                  <div className="mb-4">
                    <p className="font-medium text-primary">{method.value}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {method.availability}
                    </p>
                  </div>

                  {method.link && (
                    <Link href={method.link} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">
                        Contact Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Office Location */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Visit Our Office</h2>
            <p className="text-muted-foreground">Meet us in person in the heart of Istanbul</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Office Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">{displayData.office.name}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {displayData.office.address}<br />
                        {displayData.office.city}, {displayData.office.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Opening Hours</p>
                      <p className="text-sm text-muted-foreground">
                        {displayData.office.hours.weekdays}<br />
                        {displayData.office.hours.weekend}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground">{displayData.office.phone}</p>
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{displayData.office.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-6">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </CardContent>
            </Card>

            {/* Office Image & Map */}
            <Card className="overflow-hidden">
              <div className="relative h-64 lg:h-full min-h-[300px]">
                <Image
                  src={displayData.office.image}
                  alt={displayData.office.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="text-center text-white">
                    <MapPin className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">Interactive Map</p>
                    <p className="text-sm opacity-90">Click to view on Google Maps</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form & FAQ */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            <ContactForm />
            <FAQ />
          </div>
        </div>
      </section>
    </div>
  );
}
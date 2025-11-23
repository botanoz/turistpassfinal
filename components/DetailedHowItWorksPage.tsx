"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Share2,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Users,
  Loader2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { howItWorksData } from "@/lib/mockData/howItWorksData";
import { faqData } from "@/lib/mockData/faqData";
import { getHowItWorksSettings, type HowItWorksSettings } from "@/lib/services/settingsService";

// Video component
const VideoPlayer = ({ src, poster, title }: { src: string; poster: string; title: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        poster={poster}
        className="w-full aspect-video object-cover"
        muted={isMuted}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
        onEnded={() => setIsPlaying(false)}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support video playback.
      </video>
      
      {/* Video Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 flex flex-col justify-between p-4">
        {/* Top Controls */}
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="bg-black/50 text-white border-none">
            {title}
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center Play Button */}
        <div className="flex justify-center items-center">
          <Button
            onClick={togglePlay}
            size="lg"
            className="rounded-full w-16 h-16 bg-primary/80 hover:bg-primary text-white"
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          {/* Control Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetVideo} className="text-white hover:bg-white/20">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DetailedHowItWorksPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("general");
  const [settings, setSettings] = useState<HowItWorksSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load How It Works settings from database
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getHowItWorksSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading How It Works settings:', error);
        setSettings(null);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
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

    const element = document.querySelector('#detailed-how-it-works');
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (element && observerRef.current) {
        observerRef.current.unobserve(element);
      }
    };
  }, []);

  // Merge settings with mock data to create display data
  const displayData = settings ? {
    detailedPage: {
      ...howItWorksData.detailedPage!,
      heroTitle: settings.detailedTitle,
      heroSubtitle: settings.detailedSubtitle,
      overviewVideo: {
        src: settings.overviewVideoUrl,
        poster: settings.overviewVideoPoster,
        title: settings.overviewVideoTitle,
      },
      quickStats: [
        {
          ...howItWorksData.detailedPage!.quickStats[0],
          number: settings.statLocations,
          label: settings.statLocationsLabel,
        },
        {
          ...howItWorksData.detailedPage!.quickStats[1],
          number: settings.statCustomers,
          label: settings.statCustomersLabel,
        },
        {
          ...howItWorksData.detailedPage!.quickStats[2],
          number: settings.statSavings,
          label: settings.statSavingsLabel,
        },
        {
          ...howItWorksData.detailedPage!.quickStats[3],
          number: settings.statRating,
          label: settings.statRatingLabel,
        },
      ],
      benefits: [
        {
          ...howItWorksData.detailedPage!.benefits[0],
          title: settings.benefit1Title,
          description: settings.benefit1Description,
        },
        {
          ...howItWorksData.detailedPage!.benefits[1],
          title: settings.benefit2Title,
          description: settings.benefit2Description,
        },
        {
          ...howItWorksData.detailedPage!.benefits[2],
          title: settings.benefit3Title,
          description: settings.benefit3Description,
        },
        {
          ...howItWorksData.detailedPage!.benefits[3],
          title: settings.benefit4Title,
          description: settings.benefit4Description,
        },
      ],
      cta: {
        title: settings.ctaTitle,
        subtitle: settings.ctaSubtitle,
        primaryButton: settings.ctaButton1Text,
        secondaryButton: settings.ctaButton2Text,
      },
    },
    steps: howItWorksData.steps.map((step, index) => ({
      ...step,
      title: index === 0 ? settings.step1Title :
             index === 1 ? settings.step2Title :
             index === 2 ? settings.step3Title :
             settings.step4Title,
      description: index === 0 ? settings.step1Description :
                   index === 1 ? settings.step2Description :
                   index === 2 ? settings.step3Description :
                   settings.step4Description,
      videoSrc: index === 0 ? settings.step1VideoUrl :
                index === 1 ? settings.step2VideoUrl :
                index === 2 ? settings.step3VideoUrl :
                settings.step4VideoUrl,
      videoPoster: index === 0 ? settings.step1VideoPoster :
                   index === 1 ? settings.step2VideoPoster :
                   index === 2 ? settings.step3VideoPoster :
                   settings.step4VideoPoster,
    })),
  } : {
    detailedPage: howItWorksData.detailedPage!,
    steps: howItWorksData.steps,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading How It Works page...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="detailed-how-it-works" className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple/5" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              Step by Step Guide
            </Badge>
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {displayData.detailedPage.heroTitle.split(' ')[0]} <span className="text-primary">{displayData.detailedPage.heroTitle.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className={`text-xl text-muted-foreground max-w-3xl mx-auto transition-all duration-700 delay-200 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {displayData.detailedPage.heroSubtitle}
            </p>
          </div>

          {/* Overview Video */}
          <div className={`max-w-4xl mx-auto mb-20 transition-all duration-700 delay-400 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <VideoPlayer
              src={displayData.detailedPage.overviewVideo.src}
              poster={displayData.detailedPage.overviewVideo.poster}
              title={displayData.detailedPage.overviewVideo.title}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {displayData.detailedPage.quickStats.map((stat, index) => (
              <Card key={index} className={`text-center p-6 transition-all duration-700 delay-${600 + index * 100} transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Detailed Steps</h2>
            <p className="text-lg text-muted-foreground">Examine each step in detail</p>
          </div>

          <div className="space-y-24">
            {displayData.steps.map((step, index) => (
              <div key={index} className={`grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                
                {/* Content */}
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">Step {index + 1}</Badge>
                      <h3 className="text-2xl font-bold">{step.title}</h3>
                      <p className="text-muted-foreground">{step.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-lg mb-6">{step.description}</p>

                  {/* Features */}
                  {step.features && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Features:</h4>
                      <div className="space-y-2">
                        {step.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {step.tips && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">💡 Tips:</h4>
                      <div className="space-y-2">
                        {step.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm text-muted-foreground">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  {step.stats && (
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(step.stats).map(([key, value]) => (
                        <div key={key} className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="font-bold text-primary">{value}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video */}
                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  {step.videoSrc && step.videoPoster && (
                    <VideoPlayer 
                      src={step.videoSrc}
                      poster={step.videoPoster}
                      title={step.title}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why TuristPass?</h2>
            <p className="text-lg text-muted-foreground">Exclusive advantages for you</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayData.detailedPage.benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-all duration-300">
                <benefit.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Everything you&apos;re curious about</p>
          </div>

          {/* FAQ Categories */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {faqData.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="gap-2"
              >
                <category.icon className="h-4 w-4" />
                {category.label}
              </Button>
            ))}
          </div>

          {/* FAQ Questions */}
          <div className="space-y-4">
            {faqData
              .find(cat => cat.id === activeCategory)
              ?.questions.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                      <ArrowRight className={`h-5 w-5 transition-transform ${openFaq === index ? 'rotate-90' : ''}`} />
                    </div>
                  </CardHeader>
                  {openFaq === index && (
                    <CardContent className="pt-0">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{displayData.detailedPage.cta.title}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {displayData.detailedPage.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/#passes-section">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <ShoppingBag className="h-5 w-5 mr-2" />
                {displayData.detailedPage.cta.primaryButton}
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              <Users className="h-5 w-5 mr-2" />
              {displayData.detailedPage.cta.secondaryButton}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
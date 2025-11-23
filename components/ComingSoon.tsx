"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Apple, PlayCircle, Smartphone } from "lucide-react";
import { comingSoonData } from "@/lib/mockData/comingSoonData";

export default function ComingSoon() {
  const [isVisible, setIsVisible] = useState(false);

  // Destructure mock data
  const { 
    title, 
    description, 
    storeButtons, 
    floatingDevices 
  } = comingSoonData;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("coming-soon-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  // Dynamic icon rendering
  const renderStoreIcon = (iconName: string) => {
    const iconMap = {
      "Apple": Apple,
      "PlayCircle": PlayCircle
    };
    const Icon = iconMap[iconName as keyof typeof iconMap];
    return Icon ? <Icon className="mr-2 h-5 w-5" /> : null;
  };

  return (
    <section id="coming-soon-section" className="relative py-20 overflow-hidden bg-background">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mobile-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L40 20L20 40L0 20Z" stroke="currentColor" strokeWidth="0.5" fill="none"/>
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#mobile-pattern)" className="text-primary" />
          </svg>
        </div>
      </div>

      {/* Floating Devices - Sabit değerlerle */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {floatingDevices.map((device, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: device.left,
              top: device.top,
              animationDelay: device.delay,
            }}
          >
            <Smartphone 
              className="text-primary opacity-10" 
              style={{
                width: device.width,
                height: device.height,
                transform: `rotate(${device.rotation})`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="relative grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-left">
            <h2 className={`text-3xl md:text-4xl font-bold mb-6 transition-all duration-700 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {title.main} <br />
              <span className="text-primary relative inline-block mt-2">
                {title.highlight}
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 10" fill="none">
                  <path d="M0,5 C50,5 50,-2 100,5 C150,-2 150,5 200,5" 
                        stroke="currentColor" strokeWidth="2" 
                        className="text-primary animate-draw" 
                        strokeDasharray="1" strokeDashoffset="1" 
                        pathLength="1" />
                </svg>
              </span>
            </h2>
            
            <p className={`text-lg text-muted-foreground max-w-xl mb-8 transition-all duration-700 delay-100 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              {description}
            </p>

            {/* Store Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-200 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <Button 
                size="lg" 
                className="relative overflow-hidden group bg-primary/10 hover:bg-primary/20 text-primary"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {renderStoreIcon(storeButtons.apple.icon)}
                {storeButtons.apple.label}
              </Button>
              <Button 
                size="lg" 
                className="relative overflow-hidden group bg-primary/10 hover:bg-primary/20 text-primary"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {renderStoreIcon(storeButtons.google.icon)}
                {storeButtons.google.label}
              </Button>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className={`relative transition-all duration-1000 delay-300 transform
            ${isVisible ? 'translate-y-0 opacity-100 rotate-0' : 'translate-y-20 opacity-0 rotate-12'}`}>
            <div className="relative aspect-[9/19] max-w-[300px] mx-auto">
              <div className="absolute inset-0 rounded-[3rem] border-8 border-foreground/10 bg-gradient-to-br from-foreground/10 via-foreground/5 to-foreground/10 backdrop-blur-sm">
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                  <div className="w-20 h-6 bg-foreground/10 rounded-b-xl" />
                </div>
              </div>
              <div className="absolute inset-2 rounded-[2.5rem] overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-primary/20 animate-pulse-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone className="w-16 h-16 text-primary/20" />
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse-slow" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
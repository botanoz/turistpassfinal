"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";

type AnimatedBackgroundProps = {
  variant?: "geometric" | "minimal" | "dots" | "istanbul" | "waves" | "traditional";
  opacity?: number;
  animated?: boolean;
  patternDensity?: "light" | "medium" | "dense";
  color?: "primary" | "secondary" | "accent" | "muted" | "chart-1" | "chart-2" | "chart-3";
  interactive?: boolean;
  parallax?: boolean;
  blurStrength?: "none" | "light" | "medium" | "strong";
  showGradient?: boolean;
  keywords?: string[];
};

// Default Turkish product keywords for background
const defaultTurkishProducts = [
  "Turkish Carpets", "Peshtemals", "Ceramics", "Spices", "Leather Goods", 
  "Gold Jewelry", "Turkish Delight", "Antiques", "Textiles", "Glassware", 
  "Olive Oil", "Perfumes", "Baklava", "Simit", "Köfte", "Turkish Coffee", 
  "Turkish Tea", "Evil Eye", "Glass Lanterns", "Ottoman Trays", "Turkish Rugs", 
  "Mosaic Lamps", "Copper Cookware", "Hand-Painted Plates", "Turkish Scarves",
  "Kebab", "Doner", "Meze", "Lahmacun", "Börek", "Çörek", "Fish Sandwich", 
  "Balık Ekmek", "Pide", "Kumpir", "Sütlaç", "Çökelek", "Ayran", "Lokma", 
  "Rose Jam", "Sesame Sticks", "Turkish Sausage", "Sucuk", "Turkish Ice Cream", 
  "Dondurma", "Honeycomb", "Gözleme", "Walnut Halva", "Fig Jam", "Mulberry Jam", 
  "Pistachio Sweets", "Almond Sweets", "Olive Paste", "Nazar Boncuk", "Ceramic Tiles"
];

export default function AnimatedBackground({
  variant = "istanbul",
  opacity = 0.15, // Reduced opacity to avoid text interference
  animated = true,
  patternDensity = "light", // Reduced to light to avoid overcrowding
  color = "primary",
  interactive = true,
  parallax = true,
  blurStrength = "medium", // Added medium blur to further separate background
  showGradient = true,
  keywords = defaultTurkishProducts,
}: AnimatedBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  
  // Blur strength classes
  const blurClasses = useMemo(() => {
    return {
      none: "",
      light: "backdrop-blur-sm",
      medium: "backdrop-blur-md",
      strong: "backdrop-blur-lg",
    }[blurStrength];
  }, [blurStrength]);

  // Istanbul-specific background elements with improved layering
  const istanbulElements = useMemo(() => {
    // Create 3-5 signature Istanbul silhouette elements
    return [
      { 
        type: "minaret", 
        left: "10%", 
        bottom: "5%", 
        height: "30%", 
        opacity: 0.08 
      },
      { 
        type: "dome", 
        left: "25%", 
        bottom: "2%", 
        width: "15%", 
        height: "15%", 
        opacity: 0.06 
      },
      { 
        type: "bosphorus", 
        bottom: "0", 
        left: "0", 
        width: "100%", 
        height: "5%", 
        opacity: 0.05 
      },
      { 
        type: "seagull", 
        top: "15%", 
        left: "70%", 
        width: "5%", 
        opacity: 0.07 
      },
      { 
        type: "galata", 
        right: "15%", 
        bottom: "3%", 
        height: "25%", 
        opacity: 0.08 
      }
    ];
  }, []);

  // Keywords count based on density - reduced counts overall
  const keywordCount = useMemo(() => {
    const baseCount = Math.min(keywords.length, 60); // Reduced from 80
    return {
      light: Math.floor(baseCount * 0.4), // Reduced from 0.6
      medium: Math.floor(baseCount * 0.6), // Reduced from 0.8
      dense: Math.floor(baseCount * 0.8) // Reduced from full baseCount
    }[patternDensity];
  }, [keywords.length, patternDensity]);

  // Position keywords across the screen with better spacing
  const displayedKeywords = useMemo(() => {
    // Shuffle and select keywords based on density
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, keywordCount);
    
    // Create a grid-like distribution with minimum spacing
    const grid = Array(5).fill(0).map(() => Array(5).fill(false));
    
    return selected.map((keyword, index) => {
      // Calculate grid position to ensure better distribution
      const gridX = index % 5;
      const gridY = Math.floor(index / 5) % 5;
      
      // Add some randomness within the grid cell
      const cellWidth = 100 / 5;
      const cellHeight = 100 / 5;
      
      const left = (gridX * cellWidth) + (Math.random() * (cellWidth * 0.6)) + (cellWidth * 0.2);
      const top = (gridY * cellHeight) + (Math.random() * (cellHeight * 0.6)) + (cellHeight * 0.2);
      
      const rotate = Math.random() * 20 - 10; // Reduced rotation range from -20/20 to -10/10
      const fontSize = Math.random() * 0.4 + 0.6; // Reduced size range from 0.8-1.6 to 0.6-1.0
      const opacity = Math.random() * 0.1 + 0.05; // Significantly reduced from 0.15-0.45 to 0.05-0.15
      
      return {
        keyword,
        style: {
          left: `${left}%`,
          top: `${top}%`,
          transform: `rotate(${rotate}deg)`,
          fontSize: `${fontSize}rem`,
          opacity
        }
      };
    });
  }, [keywords, keywordCount]);

  // Animation for Istanbul elements
  const [animationOffset, setAnimationOffset] = useState(0);
  
  useEffect(() => {
    setMounted(true);
    
    if (animated) {
      const animationInterval = setInterval(() => {
        setAnimationOffset(prev => (prev + 0.1) % 100);
      }, 50);
      
      return () => clearInterval(animationInterval);
    }
  }, [animated]);

  // Only render on client to avoid hydration issues
  if (!mounted) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${blurClasses}`}>
      {/* Istanbul-themed silhouette elements */}
      {variant === "istanbul" && (
        <div className="absolute inset-0 select-none">
          {istanbulElements.map((element, index) => {
            // For minaret elements
            if (element.type === "minaret") {
              return (
                <div
                  key={`istanbul-${index}`}
                  className="absolute bg-primary/10"
                  style={{
                    left: element.left,
                    bottom: element.bottom,
                    width: '3%',
                    height: element.height,
                    opacity: element.opacity,
                    borderTopLeftRadius: '50%',
                    borderTopRightRadius: '50%',
                    transform: animated ? `translateY(${Math.sin(animationOffset + index) * 5}px)` : 'none'
                  }}
                />
              );
            }
            
            // For dome elements
            if (element.type === "dome") {
              return (
                <div
                  key={`istanbul-${index}`}
                  className="absolute bg-primary/10"
                  style={{
                    left: element.left,
                    bottom: element.bottom,
                    width: element.width,
                    height: element.height,
                    opacity: element.opacity,
                    borderTopLeftRadius: '100%',
                    borderTopRightRadius: '100%',
                    transform: animated ? `translateY(${Math.sin(animationOffset + index) * 3}px)` : 'none'
                  }}
                />
              );
            }
            
            // For Bosphorus water
            if (element.type === "bosphorus") {
              return (
                <div
                  key={`istanbul-${index}`}
                  className="absolute bg-accent/10"
                  style={{
                    left: element.left,
                    bottom: element.bottom,
                    width: element.width,
                    height: element.height,
                    opacity: element.opacity,
                    transform: animated ? `translateY(${Math.sin(animationOffset) * 2}px)` : 'none'
                  }}
                />
              );
            }
            
            // For Galata Tower
            if (element.type === "galata") {
              return (
                <div
                  key={`istanbul-${index}`}
                  className="absolute bg-primary/10"
                  style={{
                    right: element.right,
                    bottom: element.bottom,
                    width: '4%',
                    height: element.height,
                    opacity: element.opacity,
                    borderTopLeftRadius: '30%',
                    borderTopRightRadius: '30%',
                    transform: animated ? `translateY(${Math.sin(animationOffset + index) * 2}px)` : 'none'
                  }}
                />
              );
            }
            
            // For seagull
            if (element.type === "seagull") {
              return (
                <div 
                  key={`istanbul-${index}`}
                  className="absolute"
                  style={{
                    top: element.top,
                    left: element.left,
                    width: element.width,
                    opacity: element.opacity,
                    transform: animated ? `translate(${Math.sin(animationOffset * 0.5) * 50}px, ${Math.cos(animationOffset * 0.3) * 20}px)` : 'none'
                  }}
                >
                  <div className="w-4 h-1 bg-primary/20 rounded-full transform rotate-12" />
                  <div className="w-4 h-1 bg-primary/20 rounded-full transform -rotate-12 -ml-2" />
                </div>
              );
            }
            
            return null;
          })}
        </div>
      )}

      {/* Display keywords with improved visibility and reduced interference */}
      <div className="absolute inset-0 select-none">
        {displayedKeywords.map((item, index) => (
          <div
            key={index}
            className="absolute whitespace-nowrap"
            style={{
              ...item.style,
              position: 'absolute',
              zIndex: 1,
              transition: 'transform 0.8s ease-in-out',
              transform: animated 
                ? `rotate(${item.style.transform.replace('rotate(', '').replace('deg)', '')}deg) translateY(${Math.sin((animationOffset + index) * 0.05) * 5}px)` 
                : item.style.transform
            }}
          >
            <span className={`text-${color} font-light`}>{item.keyword}</span>
          </div>
        ))}
      </div>

      {/* Enhanced gradient overlays for better text readability */}
      {showGradient && (
        <>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-2" />
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-background to-transparent z-2" />
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-background to-transparent z-2" />
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-background to-transparent z-2" />
          {/* Corner gradients for additional protection */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-background to-transparent z-2" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-background to-transparent z-2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-background to-transparent z-2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-background to-transparent z-2" />
        </>
      )}
      
      {/* Enhanced subtle background accents */}
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl z-0" />
      {/* Additional accent for Istanbul theme */}
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-accent/3 rounded-full blur-2xl z-0" />
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus, ChevronLeft, ChevronRight, Star, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormattedPrice } from "@/components/currency/FormattedPrice";

interface PassOption {
  days: number;
  adultPrice: number;
  childPrice: number;
}

// Güncellenmiş Place interface - placesData.ts ile uyumlu
interface Place {
  id: string;
  name: string;
  image: string; // Ana görsel URL'si
  slug?: string;
  rating?: string | number; // String veya number olabilir
  location?: string; // Bölge bilgisi
}

interface PassSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  passType: string;
  title: string;
  subtitle: string;
  featuredAttractions: Place[];
  passOptions: PassOption[];
  discount?: {
    percentage: number;
    amount: number;
    expiryDate?: string;
  };
  onBuyNow: (selection: PassSelection) => void;
}

interface PassSelection {
  passType: string;
  days: number;
  adults: number;
  children: number;
  totalPrice: number;
  discountCode?: string;
}

export default function PassSelectionSidebar({
  isOpen,
  onClose,
  passType,
  title,
  subtitle,
  featuredAttractions,
  passOptions,
  discount,
  onBuyNow,
}: PassSelectionProps) {
  const [selectedDays, setSelectedDays] = useState<number>(passOptions[0]?.days || 1);
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [isValidatingCode, setIsValidatingCode] = useState<boolean>(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    discountAmount?: number;
    error?: string;
  } | null>(null);

  const attractionsContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Find the selected pass option based on days
  const selectedOption = passOptions.find(option => option.days === selectedDays) || passOptions[0];
  
  // Validate discount code
  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setCodeValidation(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const subtotal = adultCount * selectedOption.adultPrice + childCount * selectedOption.childPrice;

      const response = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode,
          subtotal,
          pass_id: null, // Can be enhanced to pass actual pass ID
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setCodeValidation({
          valid: true,
          discountAmount: data.discountAmount,
        });
      } else {
        setCodeValidation({
          valid: false,
          error: data.error || "Invalid discount code",
        });
      }
    } catch (error) {
      console.error("Error validating discount code:", error);
      setCodeValidation({
        valid: false,
        error: "Failed to validate code",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Calculate total price - Apply percentage-based discount correctly
  const calculateTotal = () => {
    const adultTotal = adultCount * selectedOption.adultPrice;
    const childTotal = childCount * selectedOption.childPrice;
    const subtotal = adultTotal + childTotal;

    // Apply discount code if valid (takes priority)
    if (codeValidation?.valid && codeValidation.discountAmount) {
      return subtotal - codeValidation.discountAmount;
    }

    // Otherwise apply pass discount if available
    if (discount) {
      const discountAmount = (subtotal * discount.percentage) / 100;
      return subtotal - discountAmount;
    }

    return subtotal;
  };

  const totalPrice = calculateTotal();
  
  // Reset state when pass type changes
  useEffect(() => {
    if (passOptions.length > 0) {
      setSelectedDays(passOptions[0].days);
    }
    setAdultCount(1);
    setChildCount(0);
    setCurrentSlide(0);
  }, [passType, passOptions]);
  
  // Handle counter changes
  const handleCounter = (type: 'adult' | 'child', action: 'increase' | 'decrease') => {
    if (type === 'adult') {
      if (action === 'increase') {
        setAdultCount(prev => prev + 1);
      } else if (action === 'decrease' && adultCount > 1) {
        setAdultCount(prev => prev - 1);
      }
    } else {
      if (action === 'increase') {
        setChildCount(prev => prev + 1);
      } else if (action === 'decrease' && childCount > 0) {
        setChildCount(prev => prev - 1);
      }
    }
  };
  
  // Handle buy now
  const handleBuyNow = () => {
    onBuyNow({
      passType,
      days: selectedDays,
      adults: adultCount,
      children: childCount,
      totalPrice,
      discountCode: codeValidation?.valid ? discountCode : undefined,
    });
  };

  // Handle attraction carousel
  const showNextAttraction = () => {
    if (attractionsContainerRef.current && featuredAttractions.length > 0) {
      const maxSlides = Math.ceil(featuredAttractions.length / 2) - 1;
      setCurrentSlide(prev => (prev < maxSlides ? prev + 1 : 0));
    }
  };

  const showPrevAttraction = () => {
    if (attractionsContainerRef.current && featuredAttractions.length > 0) {
      const maxSlides = Math.ceil(featuredAttractions.length / 2) - 1;
      setCurrentSlide(prev => (prev > 0 ? prev - 1 : maxSlides));
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.pass-selection-sidebar') && !target.closest('[data-buy-button]')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Animation effect
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      sidebarRef.current.classList.add('translate-x-0');
      sidebarRef.current.classList.remove('translate-x-full');
    }
  }, [isOpen]);

  const handleClose = () => {
    if (sidebarRef.current) {
      sidebarRef.current.classList.remove('translate-x-0');
      sidebarRef.current.classList.add('translate-x-full');
      
      setTimeout(() => {
        onClose();
      }, 300);
    } else {
      onClose();
    }
  };

  // Calculate subtotal and discount amounts for display
  const subtotal = adultCount * selectedOption.adultPrice + childCount * selectedOption.childPrice;

  // Determine which discount to apply (code takes priority)
  let appliedDiscount = 0;
  let discountSource: 'code' | 'pass' | null = null;

  if (codeValidation?.valid && codeValidation.discountAmount) {
    appliedDiscount = codeValidation.discountAmount;
    discountSource = 'code';
  } else if (discount && discount.percentage > 0) {
    appliedDiscount = (subtotal * discount.percentage) / 100;
    discountSource = 'pass';
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300">
      <div 
        ref={sidebarRef}
        className="pass-selection-sidebar fixed right-0 top-0 h-full w-full sm:w-[460px] bg-background shadow-xl overflow-hidden flex flex-col transform translate-x-full transition-transform duration-300 ease-in-out"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        
        {/* Content */}
        <div className="flex-grow p-4 overflow-y-auto">
          {/* Featured Attractions Section */}
          {featuredAttractions && featuredAttractions.length > 0 ? (
            <div className="mb-8">
              <h3 className="font-semibold text-base mb-3">Included premium places</h3>
              
              {/* Place cards grid */}
              <div className="grid grid-cols-2 gap-3">
                {featuredAttractions.slice(0, 4).map((place) => (
                  <Link 
                    key={place.id} 
                    href={`/places/${place.slug || place.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg overflow-hidden h-full hover:shadow-md transition-shadow">
                      <div className="relative h-32 w-full bg-gray-100">
                        <Image 
                          src={place.image} 
                          alt={place.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                        {place.rating && (
                          <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-1.5 py-0.5 rounded-md flex items-center">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-0.5" />
                            {typeof place.rating === 'number' ? place.rating.toFixed(1) : place.rating}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h4 className="font-medium text-sm line-clamp-1">{place.name}</h4>
                        {place.location && (
                          <div className="flex items-center mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground mr-1" />
                            <p className="text-xs text-muted-foreground truncate">{place.location}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* "See all" link if there are more than 4 attractions */}
              {featuredAttractions.length > 4 && (
                <div className="text-center mt-3">
                  <Link 
                    href={`/places?pass=${passType}`}
                    className="text-xs text-primary hover:underline inline-flex items-center"
                  >
                    See all {featuredAttractions.length} included places
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
          
          {/* Pass Duration Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-base mb-3">Select the number of days</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {passOptions.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setSelectedDays(option.days)}
                  className={`py-3 px-4 border rounded-md text-center transition-all ${
                    selectedDays === option.days
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">{option.days} {option.days === 1 ? 'day' : 'days'}</p>
                  <p className="text-sm font-semibold"><FormattedPrice price={option.adultPrice} /></p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Person Counter Section */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-base">Select number of passes</h3>
            
            {/* Adult Counter */}
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Adult</p>
                <p className="text-sm text-muted-foreground"><FormattedPrice price={selectedOption.adultPrice} /> per person</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleCounter('adult', 'decrease')}
                  disabled={adultCount <= 1} // Always need at least 1 adult
                  className={`p-1.5 rounded-full ${
                    adultCount <= 1 ? 'text-muted-foreground bg-muted cursor-not-allowed' : 'bg-muted hover:bg-muted/80'
                  }`}
                  aria-label="Decrease adult count"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center">{adultCount}</span>
                <button 
                  onClick={() => handleCounter('adult', 'increase')}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80"
                  aria-label="Increase adult count"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Child Counter */}
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Child (5-15)</p>
                <p className="text-sm text-muted-foreground"><FormattedPrice price={selectedOption.childPrice} /> per person</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleCounter('child', 'decrease')}
                  disabled={childCount === 0}
                  className={`p-1.5 rounded-full ${
                    childCount === 0 ? 'text-muted-foreground bg-muted cursor-not-allowed' : 'bg-muted hover:bg-muted/80'
                  }`}
                  aria-label="Decrease child count"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center">{childCount}</span>
                <button 
                  onClick={() => handleCounter('child', 'increase')}
                  className="p-1.5 rounded-full bg-muted hover:bg-muted/80"
                  aria-label="Increase child count"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Discount Code Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-base mb-3">Discount Code</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value.toUpperCase());
                  setCodeValidation(null); // Clear validation when typing
                }}
                placeholder="Enter code (e.g., SUMMER15)"
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={20}
              />
              <Button
                onClick={validateDiscountCode}
                disabled={!discountCode.trim() || isValidatingCode}
                size="sm"
                variant="outline"
                className="px-4"
              >
                {isValidatingCode ? "..." : "Apply"}
              </Button>
            </div>

            {/* Validation feedback */}
            {codeValidation && (
              <div className={`mt-2 text-sm ${codeValidation.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {codeValidation.valid ? (
                  <div className="flex items-center gap-1">
                    <span>✓ Code applied! You save ${codeValidation.discountAmount?.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span>✗ {codeValidation.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {subtotal > 0 && (
            <div className="mb-6 p-4 bg-muted/20 border rounded-md">
              <h3 className="font-medium text-sm mb-2">Order Summary</h3>

              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span>Adult Passes ({adultCount})</span>
                  <span><FormattedPrice price={adultCount * selectedOption.adultPrice} /></span>
                </div>

                {childCount > 0 && (
                  <div className="flex justify-between">
                    <span>Child Passes ({childCount})</span>
                    <span><FormattedPrice price={childCount * selectedOption.childPrice} /></span>
                  </div>
                )}

                <div className="flex justify-between font-medium pt-2 border-t border-border/30 mt-2">
                  <span>Subtotal</span>
                  <span><FormattedPrice price={subtotal} /></span>
                </div>

                {/* Show only the applied discount */}
                {appliedDiscount > 0 && (
                  <div className={`flex justify-between ${discountSource === 'code' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    <span>
                      {discountSource === 'code' ? 'Discount Code' : `Discount (${discount?.percentage}%)`}
                    </span>
                    <span>-<FormattedPrice price={appliedDiscount} /></span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Discount Section */}
          {discount && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-md dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-50">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Today&apos;s sale</p>
                <p className="text-sm font-medium">
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-sm text-xs mr-2">
                    {discount.percentage}% off
                  </span>
                </p>
              </div>
              {discount.expiryDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Valid until {new Date(discount.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Footer with total and button */}
        <div className="sticky bottom-0 z-10 bg-background p-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold"><FormattedPrice price={totalPrice} /></span>
          </div>
          
          <Button 
            onClick={handleBuyNow}
            className="w-full"
          >
            Buy now
          </Button>
        </div>
      </div>
    </div>
  );
}
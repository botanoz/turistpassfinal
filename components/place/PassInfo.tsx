// components/place/PassInfo.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, CheckCircle, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import { PassData } from "@/lib/mockData/passesData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PassInfoProps {
  passIds: string[];
  selectedPassId: string | null;
  setSelectedPassId: (id: string | null) => void;
  setIsPassSidebarOpen: (isOpen: boolean) => void;
  passes: Record<string, PassData>;
}

export default function PassInfo({
  passIds,
  selectedPassId,
  setSelectedPassId,
  setIsPassSidebarOpen,
  passes
}: PassInfoProps) {
  // Varsayılan olarak ilk pass'i seç
  const defaultPassId = passIds.length > 0 ? passIds[0] : 'sfPlus';
  
  // Seçilen pass
  const selectedPass = passes[selectedPassId || defaultPassId];

  return (
    <div className="sticky top-24">
      {passIds.length > 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              Included in These Passes
            </h3>

            {/* Eğer birden fazla pass varsa, dropdown göster */}
            {passIds.length > 1 ? (
              <div className="mb-4">
                <Select
                  value={selectedPassId || defaultPassId}
                  onValueChange={setSelectedPassId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a pass">
                      {selectedPass?.title || 'Select a pass'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {passIds.map(passId => (
                      <SelectItem key={passId} value={passId}>
                        {passes[passId]?.title || passId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mb-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedPass?.title}
                </Badge>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-6">
              Get access to this venue and many more with a single pass
            </p>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Skip the line access</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Special discounts</span>
              </div>
              {selectedPass && (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Valid for {selectedPass.passOptions[0]?.days} days</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Access to {selectedPass.accessCount}+ premium venues</span>
                  </div>
                </>
              )}
            </div>

            {selectedPass?.discount && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-red-600 dark:text-red-300">Limited offer</p>
                  <Badge variant="destructive">
                    {selectedPass.discount.percentage}% OFF
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={() => setIsPassSidebarOpen(true)}
                className="w-full"
                data-buy-button="true"
              >
                <Ticket className="h-4 w-4 mr-2" />
                Buy Pass Now
              </Button>
              
              <Link href={`/places?pass=${selectedPassId || defaultPassId}`}>
                <Button variant="outline" className="w-full">
                  View all included places
                </Button>
              </Link>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-1 group relative">
                <div className="relative">
                  <AlertCircle className="h-4 w-4 text-blue-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-center">
                      <p className="font-medium mb-1">Free Cancellation Policy</p>
                      <p>Cancel your pass up to 24 hours before your visit for a full refund. No questions asked, no cancellation fees.</p>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                <span>Free cancellation available</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              Explore with Our Passes
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6">
              Get access to premium venues with our city passes
            </p>

            <div className="space-y-3">
              <Link href="/passes">
                <Button variant="default" className="w-full">
                  View All Passes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

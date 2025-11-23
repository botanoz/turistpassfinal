// components/place/AboutTab.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AboutTabProps {
  description: string;
  businessInfo?: {
    established?: string;
    capacity?: string;
    dressCode?: string;
    languages?: string[];
  };
}

export default function AboutTab({ description, businessInfo }: AboutTabProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          {description}
        </p>

        {businessInfo && Object.values(businessInfo).some(Boolean) && (
          <>
            <h3 className="font-semibold text-lg mb-3">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {businessInfo.established && (
                <div>
                  <span className="text-muted-foreground">Established:</span>
                  <span className="ml-2">{businessInfo.established}</span>
                </div>
              )}
              {businessInfo.capacity && (
                <div>
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="ml-2">{businessInfo.capacity}</span>
                </div>
              )}
              {businessInfo.dressCode && (
                <div>
                  <span className="text-muted-foreground">Dress Code:</span>
                  <span className="ml-2">{businessInfo.dressCode}</span>
                </div>
              )}
              {businessInfo.languages && businessInfo.languages.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Languages:</span>
                  <span className="ml-2">{businessInfo.languages.join(", ")}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
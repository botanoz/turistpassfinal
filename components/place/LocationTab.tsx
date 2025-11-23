// components/place/LocationTab.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Globe, Instagram, Facebook } from "lucide-react";
import { PlaceBranch } from "@/lib/mockData/placesData";

interface LocationTabProps {
  name: string;
  locationAddress: string;
  branches?: PlaceBranch[];
  selectedBranch: string | null;
  onSelectBranch: (branchId: string) => void;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    social?: {
      instagram?: string;
      facebook?: string;
    };
  };
}

export default function LocationTab({
  name,
  locationAddress,
  branches,
  selectedBranch,
  onSelectBranch,
  contact
}: LocationTabProps) {
  // Get active branch
  const activeBranch = React.useMemo(() => {
    if (!branches || branches.length <= 1) return null;
    if (!selectedBranch) return branches[0];
    return branches.find(b => b.id === selectedBranch) || branches[0];
  }, [branches, selectedBranch]);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Location & Contact</h2>
        
        {/* Map Section */}
        <div className="mb-6">
          <div className="h-64 md:h-80 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
            {/* Map placeholder - in production, replace with actual map */}
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-2 opacity-70" />
                <p className="text-muted-foreground text-sm">
                  {activeBranch?.name || name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeBranch?.address || locationAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Locations List */}
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Our Locations</h3>
            <div className="space-y-3">
              {/* If no branches, show a single non-clickable location box */}
              {(!branches || branches.length <= 1) ? (
                <div className="border p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">{name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{locationAddress}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Show list of clickable branch boxes
                branches?.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => onSelectBranch(branch.id)}
                    className={`w-full text-left border p-3 rounded-lg transition-colors ${
                      (!selectedBranch && branch.id === branches[0].id) || 
                      selectedBranch === branch.id
                        ? 'bg-primary/5 border-primary/20'
                        : 'hover:bg-secondary/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        (!selectedBranch && branch.id === branches[0].id) || 
                        selectedBranch === branch.id
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          (!selectedBranch && branch.id === branches[0].id) || 
                          selectedBranch === branch.id
                            ? 'text-primary'
                            : ''
                        }`}>{branch.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="font-medium mb-3">Contact Information</h3>
            <div className="space-y-3">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  {contact.phone}
                </a>
              )}
              
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  {contact.email}
                </a>
              )}
              
              {contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                  Website
                </a>
              )}
              
              {contact.social?.instagram && (
                <a
                  href={`https://instagram.com/${contact.social.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Instagram className="h-4 w-4 text-primary flex-shrink-0" />
                  {contact.social.instagram}
                </a>
              )}
              
              {contact.social?.facebook && (
                <a
                  href={`https://facebook.com/${contact.social.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <Facebook className="h-4 w-4 text-primary flex-shrink-0" />
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
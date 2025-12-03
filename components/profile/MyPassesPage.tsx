"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ticket,
  QrCode,
  Key,
  Calendar,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
  Package
} from "lucide-react";
import Link from "next/link";
import { authService } from "@/lib/services/authService";
import type { User as LocalUser } from "@/lib/types/user";
import { toast } from "sonner";

export default function MyPassesPage() {
  const mapLocalPasses = (user: LocalUser) => {
    return (user.passes || []).map(pass => ({
      id: pass.id,
      passId: pass.id,
      passName: pass.name,
      passType: "local",
      activationCode: `LOCAL-${pass.id}`,
      pinCode: "000000",
      expiryDate: pass.expiryDate,
      status: pass.status,
      purchasedAt: user.joinedDate,
      order: null
    }));
  };

  const router = useRouter();
  const [passes, setPasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingPassId, setActivatingPassId] = useState<string | null>(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);

  const loadPasses = async () => {
    try {
      setIsLoading(true);
      const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
      const response = await fetch('/api/customer/passes');
      const result = await response.json();

      if (response.status === 401) {
        if (localUser) {
          setPasses(mapLocalPasses(localUser));
          return;
        }
        router.push("/login?redirect=/my-passes");
        return;
      }

      if (!result.success) {
        if (localUser) {
          setPasses(mapLocalPasses(localUser));
          return;
        }
        throw new Error(result.error || 'Failed to load passes');
      }

      setPasses(result.passes || []);
    } catch (err: any) {
      console.error('Error loading passes:', err);
      const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
      if (localUser) {
        setPasses(mapLocalPasses(localUser));
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, [router]);

  const handleActivatePass = (pass: any) => {
    setSelectedPass(pass);
    setShowActivationDialog(true);
  };

  const confirmActivation = async () => {
    if (!selectedPass) return;

    try {
      setActivatingPassId(selectedPass.id);
      setShowActivationDialog(false);

      const response = await fetch('/api/customer/passes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId: selectedPass.id })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error('Activation Failed', {
          description: result.error || 'Failed to activate pass. Please try again.',
          duration: 5000
        });
        return;
      }

      toast.success('Pass Activated!', {
        description: 'Your pass is now active and the timer has started. Enjoy your trip!',
        duration: 5000
      });

      // Reload passes to show updated status
      await loadPasses();
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error('Activation Error', {
        description: 'An error occurred while activating your pass.',
        duration: 5000
      });
    } finally {
      setActivatingPassId(null);
      setSelectedPass(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const generateQRCode = (activationCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activationCode}`;
  };

  const pendingPasses = passes.filter(p => p.status === "pending_activation");
  const activePasses = passes.filter(p => p.status === "active");
  const expiredPasses = passes.filter(p => p.status === "expired");

  const PendingPassCard = ({ pass }: { pass: any }) => {
    const isActivating = activatingPassId === pass.id;

    return (
      <Card className="border-2 border-dashed border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{pass.passName}</CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Purchased: {new Date(pass.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Package className="h-3 w-3 mr-1" />
              Ready to Activate
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              ⏱️ Pass Not Started Yet
            </p>
            <p className="text-xs text-blue-700">
              Activate your pass when you're ready to use it. The timer will start immediately upon activation.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🔒 QR Code & PIN will be revealed after activation</p>
            <p>⏰ Timer starts when you activate</p>
            <p>✨ Activate anytime before your trip</p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => handleActivatePass(pass)}
            disabled={isActivating}
          >
            {isActivating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Activating...
              </>
            ) : (
              <>
                <PlayCircle className="h-5 w-5 mr-2" />
                Activate Pass Now
              </>
            )}
          </Button>

          <Button className="w-full" variant="outline" asChild>
            <Link href="/places">
              <MapPin className="h-4 w-4 mr-2" />
              View Partner Locations
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  const ActivePassCard = ({ pass }: { pass: any }) => {
    const isExpired = pass.status === "expired";
    const qrCodeUrl = generateQRCode(pass.activationCode || pass.activation_code);
    const pin = pass.pinCode || pass.pin_code;

    return (
      <Card className={`${isExpired ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{pass.passName || pass.pass_name}</CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Expires: {new Date(pass.expiryDate || pass.expiry_date).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? (
                <><XCircle className="h-3 w-3 mr-1" /> Expired</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
              )}
            </Badge>
          </div>
        </CardHeader>

        {!isExpired && (
          <CardContent className="space-y-4">
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </TabsTrigger>
                <TabsTrigger value="pin">
                  <Key className="h-4 w-4 mr-2" />
                  PIN Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${pass.passName || pass.pass_name}`}
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Show this QR code at the venue entrance
                </p>
              </TabsContent>

              <TabsContent value="pin" className="space-y-3">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your PIN Code</p>
                    <p className="text-3xl font-bold tracking-wider font-mono text-primary">
                      {pin}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Use this PIN if QR code cannot be scanned
                </p>
              </TabsContent>
            </Tabs>

            <Button className="w-full" variant="outline" asChild>
              <Link href="/places">
                <MapPin className="h-4 w-4 mr-2" />
                View Partner Locations
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Passes</h1>
            <p className="text-muted-foreground">Manage and use your passes</p>
          </div>
        </div>

        {passes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Passes Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring Istanbul with our exclusive passes
              </p>
              <Button asChild>
                <Link href="/#passes-section">
                  Browse Passes
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingPasses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Ready to Activate ({pendingPasses.length})</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  These passes are ready to use. Activate them when you want to start the timer.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingPasses.map((pass) => (
                    <PendingPassCard key={pass.id} pass={pass} />
                  ))}
                </div>
              </div>
            )}

            {activePasses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Active Passes ({activePasses.length})</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {activePasses.map((pass) => (
                    <ActivePassCard key={pass.id} pass={pass} />
                  ))}
                </div>
              </div>
            )}

            {expiredPasses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-muted-foreground">
                    Expired Passes ({expiredPasses.length})
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {expiredPasses.map((pass) => (
                    <ActivePassCard key={pass.id} pass={pass} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Activation Confirmation Dialog */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Pass?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Are you sure you want to activate <strong>{selectedPass?.passName || selectedPass?.pass_name}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-yellow-900 font-medium">⚠️ Important:</p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                  <li>The timer will start immediately</li>
                  <li>You cannot pause or deactivate once started</li>
                  <li>Make sure you're ready to use your pass</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowActivationDialog(false);
                setSelectedPass(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmActivation}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Yes, Activate Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

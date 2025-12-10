"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Calendar,
  Activity,
  LogOut,
  Shield,
  ShieldOff,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  os: string;
  browser: string;
  last_active: string;
  first_login: string;
  ip_address: string;
  location: string;
  status: string;
  operation_count: number;
  is_trusted: boolean;
}

interface CustomerDevicesModalProps {
  customerId: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDevicesModal({
  customerId,
  customerName,
  isOpen,
  onClose
}: CustomerDevicesModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchDevices();
    }
  }, [isOpen, customerId]);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}/devices`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setDevices(result.devices || []);
    } catch (error: any) {
      toast.error('Failed to load devices');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = async (deviceId: string) => {
    if (!confirm('Are you sure you want to log out this device?')) {
      return;
    }

    try {
      setActionLoading(deviceId);
      const response = await fetch('/api/admin/devices/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Device logged out successfully');
      fetchDevices();
    } catch (error: any) {
      toast.error('Failed to log out device');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTrust = async (deviceId: string, currentTrust: boolean) => {
    try {
      setActionLoading(deviceId);
      const response = await fetch(`/api/admin/devices/${deviceId}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrusted: !currentTrust })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Device marked as ${!currentTrust ? 'trusted' : 'untrusted'}`);
      fetchDevices();
    } catch (error: any) {
      toast.error('Failed to update device');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Device Management - {customerName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {devices.length} registered device{devices.length !== 1 ? 's' : ''}
              </p>
              <Button onClick={fetchDevices} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No registered devices found for this user
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type & OS</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.device_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.device_type)}
                          <div>
                            <p className="font-medium">{device.device_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.ip_address || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{device.os || '-'}</p>
                        <Badge variant="outline" className="mt-1">
                          {device.device_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{device.browser || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm">{device.location || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs">
                            {formatDate(device.last_active)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm">{device.operation_count} operation{device.operation_count !== 1 ? 's' : ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              device.status === 'active' ? 'default' :
                              device.status === 'blocked' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {device.status === 'active' ? 'Active' :
                             device.status === 'inactive' ? 'Inactive' :
                             device.status === 'blocked' ? 'Blocked' : device.status}
                          </Badge>
                          {device.is_trusted && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Trusted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleTrust(device.device_id, device.is_trusted)}
                            disabled={actionLoading === device.device_id}
                            title={device.is_trusted ? 'Remove trust' : 'Mark as trusted'}
                          >
                            {device.is_trusted ? (
                              <ShieldOff className="h-3 w-3" />
                            ) : (
                              <Shield className="h-3 w-3" />
                            )}
                          </Button>
                          {device.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleForceLogout(device.device_id)}
                              disabled={actionLoading === device.device_id}
                              title="Force logout"
                            >
                              {actionLoading === device.device_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <LogOut className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rss,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Channel {
  id: string;
  productId: string;
  platform: string;
  platformName: string | null;
  status: string;
  lastUsedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  product: {
    name: string;
    slug: string;
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

const PLATFORMS = [
  { value: "twitter", label: "Twitter / X", icon: Twitter },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "youtube", label: "YouTube", icon: Youtube },
];

export default function ChannelsSettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    productId: "",
    platform: "",
    platformName: "",
    accessToken: "",
    accessSecret: "",
    apiKey: "",
    apiSecret: "",
  });

  // Group channels by platform
  const channelsByPlatform = channels.reduce((acc, channel) => {
    if (!acc[channel.platform]) {
      acc[channel.platform] = [];
    }
    acc[channel.platform].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  const getPlatformIcon = (platform: string) => {
    const platformConfig = PLATFORMS.find((p) => p.value === platform);
    return platformConfig?.icon || Rss;
  };

  const handleConnectChannel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formData.productId,
          platform: formData.platform,
          platformName: formData.platformName || null,
          credentials: {
            accessToken: formData.accessToken,
            accessSecret: formData.accessSecret,
            apiKey: formData.apiKey,
            apiSecret: formData.apiSecret,
          },
        }),
      });

      if (response.ok) {
        const newChannel = await response.json();
        setChannels([...channels, newChannel]);
        setIsConnectDialogOpen(false);
        setFormData({
          productId: "",
          platform: "",
          platformName: "",
          accessToken: "",
          accessSecret: "",
          apiKey: "",
          apiSecret: "",
        });
      }
    } catch (error) {
      console.error("Failed to connect channel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateChannel = async () => {
    if (!selectedChannel) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/channels/${selectedChannel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: formData.platformName,
          credentials: {
            accessToken: formData.accessToken,
            accessSecret: formData.accessSecret,
            apiKey: formData.apiKey,
            apiSecret: formData.apiSecret,
          },
        }),
      });

      if (response.ok) {
        const updatedChannel = await response.json();
        setChannels(
          channels.map((c) => (c.id === selectedChannel.id ? updatedChannel : c))
        );
        setIsEditDialogOpen(false);
        setSelectedChannel(null);
        setFormData({
          productId: "",
          platform: "",
          platformName: "",
          accessToken: "",
          accessSecret: "",
          apiKey: "",
          apiSecret: "",
        });
      }
    } catch (error) {
      console.error("Failed to update channel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (
      !confirm(
        "Are you sure you want to disconnect this channel? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChannels(channels.filter((c) => c.id !== channelId));
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  const handleTestConnection = async (channelId: string) => {
    setTestingChannelId(channelId);
    try {
      const response = await fetch(`/api/channels/${channelId}/test`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert("Connection test successful!");
          // Update channel status
          setChannels(
            channels.map((c) =>
              c.id === channelId ? { ...c, status: "active", errorMessage: null } : c
            )
          );
        } else {
          alert(`Connection test failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      alert("Connection test failed. Please try again.");
    } finally {
      setTestingChannelId(null);
    }
  };

  const openEditDialog = (channel: Channel) => {
    setSelectedChannel(channel);
    setFormData({
      productId: channel.productId,
      platform: channel.platform,
      platformName: channel.platformName || "",
      accessToken: "",
      accessSecret: "",
      apiKey: "",
      apiSecret: "",
    });
    setIsEditDialogOpen(true);
  };

  const renderCredentialFields = (platform: string) => {
    switch (platform) {
      case "twitter":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Your Twitter API Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-secret">API Secret</Label>
              <Input
                id="api-secret"
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                placeholder="Your Twitter API Secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token</Label>
              <Input
                id="access-token"
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder="Your Twitter Access Token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-secret">Access Token Secret</Label>
              <Input
                id="access-secret"
                type="password"
                value={formData.accessSecret}
                onChange={(e) =>
                  setFormData({ ...formData, accessSecret: e.target.value })
                }
                placeholder="Your Twitter Access Token Secret"
              />
            </div>
          </>
        );

      case "linkedin":
        return (
          <div className="space-y-2">
            <Label htmlFor="access-token">Access Token</Label>
            <Input
              id="access-token"
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder="Your LinkedIn Access Token"
            />
            <p className="text-sm text-muted-foreground">
              Get your access token from LinkedIn Developer Portal
            </p>
          </div>
        );

      case "facebook":
      case "instagram":
        return (
          <div className="space-y-2">
            <Label htmlFor="access-token">Page Access Token</Label>
            <Input
              id="access-token"
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder={`Your ${platform === "facebook" ? "Facebook" : "Instagram"} Page Access Token`}
            />
            <p className="text-sm text-muted-foreground">
              Get your token from Meta Developer Portal
            </p>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="access-token">Access Token</Label>
            <Input
              id="access-token"
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder="Your API Access Token"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            Settings
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Channels</h1>
          <p className="mt-2 text-muted-foreground">
            Connect and manage your social media channels
          </p>
        </div>
        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Connect New Channel</DialogTitle>
              <DialogDescription>
                Add a social media channel to publish content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, productId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          <platform.icon className="h-4 w-4" />
                          {platform.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform-name">
                  Channel Name (Optional)
                </Label>
                <Input
                  id="platform-name"
                  placeholder="e.g., Main Account, Support Team"
                  value={formData.platformName}
                  onChange={(e) =>
                    setFormData({ ...formData, platformName: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Custom name to identify this channel
                </p>
              </div>

              {formData.platform && renderCredentialFields(formData.platform)}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConnectDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleConnectChannel} disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect Channel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rss className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No channels connected</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              Connect your first social media channel to start publishing content across
              platforms.
            </p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <Button
                    key={platform.value}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => {
                      setFormData({ ...formData, platform: platform.value });
                      setIsConnectDialogOpen(true);
                    }}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs">{platform.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(channelsByPlatform).map(([platform, platformChannels]) => {
            const PlatformIcon = getPlatformIcon(platform);
            const platformConfig = PLATFORMS.find((p) => p.value === platform);

            return (
              <Card key={platform}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PlatformIcon className="h-5 w-5" />
                    <CardTitle>{platformConfig?.label || platform}</CardTitle>
                    <Badge variant="secondary">{platformChannels.length}</Badge>
                  </div>
                  <CardDescription>
                    Connected {platformConfig?.label || platform} channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {platformChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">
                              {channel.platformName || channel.platform}
                            </h5>
                            {channel.status === "active" && (
                              <Badge className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                            )}
                            {channel.status === "error" && (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Error
                              </Badge>
                            )}
                            {channel.status === "inactive" && (
                              <Badge variant="secondary">
                                <Clock className="mr-1 h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Product: {channel.product.name}
                          </p>
                          {channel.lastUsedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last used: {new Date(channel.lastUsedAt).toLocaleDateString()}
                            </p>
                          )}
                          {channel.errorMessage && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded">
                              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                              <p className="text-sm text-destructive flex-1">
                                {channel.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(channel.id)}
                            disabled={testingChannelId === channel.id}
                          >
                            {testingChannelId === channel.id ? (
                              <>
                                <PlayCircle className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(channel)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteChannel(channel.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>Update channel configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-platform-name">Channel Name</Label>
              <Input
                id="edit-platform-name"
                value={formData.platformName}
                onChange={(e) =>
                  setFormData({ ...formData, platformName: e.target.value })
                }
              />
            </div>

            {formData.platform && (
              <>
                <p className="text-sm text-muted-foreground">
                  Update credentials (leave blank to keep existing)
                </p>
                {renderCredentialFields(formData.platform)}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedChannel(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateChannel} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

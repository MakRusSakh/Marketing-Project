"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformPreview, AIGenerationModal } from "@/components/content";
import {
  Save,
  Send,
  Clock,
  Sparkles,
  Upload,
  X,
  ArrowLeft,
  Loader2,
  Hash,
  Image as ImageIcon,
} from "lucide-react";

interface ContentData {
  id: string;
  originalText: string;
  contentType: string;
  status: string;
  adapted?: Record<string, any>;
  media?: any;
  createdAt: string;
  updatedAt: string;
}

const platforms = ["twitter", "linkedin", "telegram", "discord", "instagram", "vk"];

const suggestedHashtags = [
  "#innovation",
  "#technology",
  "#AI",
  "#business",
  "#startup",
  "#digital",
  "#marketing",
  "#growth",
  "#productivity",
  "#future",
];

export default function ContentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  const isNew = contentId === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [customHashtag, setCustomHashtag] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("twitter");
  const [contentType, setContentType] = useState("post");
  const [status, setStatus] = useState<"draft" | "ready" | "published">("draft");
  const [mediaFiles, setMediaFiles] = useState<
    Array<{ id: string; url: string; type: string }>
  >([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [adaptedContent, setAdaptedContent] = useState<Record<string, any>>({});

  // Mock productId - in production, this would come from context
  const productId = "default-product-id";

  useEffect(() => {
    if (!isNew) {
      fetchContent();
    } else {
      // Check for query params (from AI generation)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const text = urlParams.get("text");
        const platform = urlParams.get("platform");
        const hashtags = urlParams.get("hashtags");

        if (text) setContent(text);
        if (platform) setSelectedPlatform(platform);
        if (hashtags) {
          setSelectedHashtags(
            hashtags.split(",").map((h) => (h.startsWith("#") ? h : `#${h}`))
          );
        }
      }
    }
  }, [contentId, isNew]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${contentId}`);
      if (!response.ok) throw new Error("Failed to fetch content");

      const data: ContentData = await response.json();
      setContent(data.originalText || "");
      setContentType(data.contentType || "post");
      setStatus(data.status as any);
      setAdaptedContent(data.adapted || {});

      // Extract hashtags if present in adapted content
      if (data.adapted) {
        const platformData = Object.values(data.adapted)[0] as any;
        if (platformData?.hashtags) {
          setSelectedHashtags(platformData.hashtags);
        }
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (newStatus?: "draft" | "ready" | "published") => {
    setIsSaving(true);
    try {
      const finalStatus = newStatus || status;
      const adapted: Record<string, any> = {};

      // Create adapted content for selected platform
      adapted[selectedPlatform] = {
        content: content,
        hashtags: selectedHashtags,
        characterCount: content.length,
      };

      const payload = {
        productId,
        originalText: content,
        contentType,
        status: finalStatus,
        adapted,
        media: mediaFiles.length > 0 ? mediaFiles : null,
      };

      let response;
      if (isNew) {
        response = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/content/${contentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error("Failed to save content");

      const data = await response.json();

      if (isNew) {
        router.push(`/content/${data.id}`);
      } else {
        setStatus(finalStatus);
        alert("Content saved successfully!");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (
      confirm(
        "Are you sure you want to publish this content? It will be scheduled for publication."
      )
    ) {
      handleSave("published");
    }
  };

  const handleSchedule = () => {
    // In a real app, this would open a date/time picker
    alert("Schedule functionality coming soon!");
  };

  const handleAddHashtag = (hashtag: string) => {
    const tag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;
    if (!selectedHashtags.includes(tag)) {
      setSelectedHashtags([...selectedHashtags, tag]);
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    setSelectedHashtags(selectedHashtags.filter((h) => h !== hashtag));
  };

  const handleAddCustomHashtag = () => {
    if (customHashtag.trim()) {
      handleAddHashtag(customHashtag.trim());
      setCustomHashtag("");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In a real app, you would upload to a storage service
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            url: reader.result as string,
            type: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (id: string) => {
    setMediaFiles(mediaFiles.filter((m) => m.id !== id));
  };

  const handleAIGenerated = (generatedData: {
    text: string;
    hashtags: string[];
    platform: string;
  }) => {
    setContent(generatedData.text);
    setSelectedHashtags(generatedData.hashtags);
    setSelectedPlatform(generatedData.platform);
  };

  const handleAdaptContent = async () => {
    if (!content.trim()) {
      alert("Please enter some content first");
      return;
    }

    try {
      const response = await fetch(`/api/content/${contentId}/adapt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: content,
          targetPlatforms: platforms.filter((p) => p !== selectedPlatform),
        }),
      });

      if (!response.ok) throw new Error("Failed to adapt content");

      const data = await response.json();
      setAdaptedContent(data.adapted || {});
      alert("Content adapted for all platforms!");
    } catch (error) {
      console.error("Error adapting content:", error);
      alert("Failed to adapt content. Please try again.");
    }
  };

  const contentWithHashtags = `${content}${selectedHashtags.length > 0 ? "\n\n" + selectedHashtags.join(" ") : ""}`;
  const characterCount = contentWithHashtags.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/content")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isNew ? "Create Content" : "Edit Content"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew
                ? "Write and adapt content for multiple platforms"
                : "Update your content and platform adaptations"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "published" ? "default" : "secondary"}>
            {status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Type & Platform */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger id="contentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="tweet">Tweet</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Primary Platform</Label>
                  <Select
                    value={selectedPlatform}
                    onValueChange={setSelectedPlatform}
                  >
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="vk">VK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Text Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Content</CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Characters:</span>
                  <Badge variant="outline">{characterCount}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content here..."
                className="min-h-[300px] text-base"
              />
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="media-upload"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">
                      Click to upload media
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Images or videos (max 10MB each)
                    </span>
                  </label>
                </div>

                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {mediaFiles.map((file) => (
                      <div
                        key={file.id}
                        className="relative aspect-square rounded-lg overflow-hidden border"
                      >
                        <img
                          src={file.url}
                          alt="Upload"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveMedia(file.id)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Previews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Previews</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6">
                  {platforms.map((platform) => (
                    <TabsTrigger key={platform} value={platform} className="capitalize">
                      {platform === "twitter" ? "X" : platform}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {platforms.map((platform) => (
                  <TabsContent key={platform} value={platform} className="mt-4">
                    <PlatformPreview
                      platform={platform}
                      content={contentWithHashtags}
                      hashtags={selectedHashtags}
                      media={mediaFiles}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setShowAIModal(true)}
                variant="outline"
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
              {!isNew && (
                <Button
                  onClick={handleAdaptContent}
                  variant="outline"
                  className="w-full"
                >
                  Adapt for All Platforms
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Hashtag Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Hashtags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Hashtags */}
              {selectedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-3 border-b">
                  {selectedHashtags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => handleRemoveHashtag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Custom Hashtag */}
              <div className="space-y-2">
                <Label htmlFor="customHashtag" className="text-xs">
                  Add Custom Hashtag
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="customHashtag"
                    value={customHashtag}
                    onChange={(e) => setCustomHashtag(e.target.value)}
                    placeholder="#yourtag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomHashtag();
                      }
                    }}
                  />
                  <Button onClick={handleAddCustomHashtag} size="sm">
                    Add
                  </Button>
                </div>
              </div>

              {/* Suggested Hashtags */}
              <div className="space-y-2">
                <Label className="text-xs">Suggested</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags
                    .filter((tag) => !selectedHashtags.includes(tag))
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleAddHashtag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => handleSave("draft")}
                variant="outline"
                className="w-full"
                disabled={isSaving || !content.trim()}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave("ready")}
                variant="secondary"
                className="w-full"
                disabled={isSaving || !content.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                Mark as Ready
              </Button>
              <Button
                onClick={handleSchedule}
                variant="outline"
                className="w-full"
                disabled={!content.trim()}
              >
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button
                onClick={handlePublish}
                className="w-full"
                disabled={isSaving || !content.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                Publish Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Generation Modal */}
      <AIGenerationModal
        open={showAIModal}
        onOpenChange={setShowAIModal}
        productId={productId}
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}

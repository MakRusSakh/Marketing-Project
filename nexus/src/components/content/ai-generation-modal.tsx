"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface AIGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onGenerated?: (content: {
    text: string;
    hashtags: string[];
    platform: string;
    contentType: string;
  }) => void;
}

type Platform = "twitter" | "linkedin" | "telegram" | "discord" | "instagram" | "vk";
type ContentType = "post" | "article" | "tweet" | "story" | "announcement" | "update" | "promotional" | "educational";
type Length = "short" | "medium" | "long";

const platforms: { value: Platform; label: string }[] = [
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "instagram", label: "Instagram" },
  { value: "vk", label: "VK" },
];

const contentTypes: { value: ContentType; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "tweet", label: "Tweet" },
  { value: "article", label: "Article" },
  { value: "story", label: "Story" },
  { value: "announcement", label: "Announcement" },
  { value: "update", label: "Update" },
  { value: "promotional", label: "Promotional" },
  { value: "educational", label: "Educational" },
];

const lengths: { value: Length; label: string; description: string }[] = [
  { value: "short", label: "Short", description: "Quick and concise" },
  { value: "medium", label: "Medium", description: "Balanced length" },
  { value: "long", label: "Long", description: "Detailed and comprehensive" },
];

export function AIGenerationModal({
  open,
  onOpenChange,
  productId,
  onGenerated,
}: AIGenerationModalProps) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [contentType, setContentType] = useState<ContentType>("post");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState<Length>("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    text: string;
    hashtags: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keywordList = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          platform,
          topic: topic.trim(),
          contentType,
          keywords: keywordList,
          length,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();

      setGeneratedContent({
        text: data.generated.text,
        hashtags: data.generated.hashtags || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content");
      console.error("Error generating content:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedContent) return;

    const fullText = `${generatedContent.text}\n\n${generatedContent.hashtags.join(" ")}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (generatedContent) {
      onGenerated?.({
        text: generatedContent.text,
        hashtags: generatedContent.hashtags,
        platform,
        contentType,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setTopic("");
    setKeywords("");
    setGeneratedContent(null);
    setError(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleUseAgain = () => {
    setGeneratedContent(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Content Generator
          </DialogTitle>
          <DialogDescription>
            Generate engaging content for your social media platforms using AI
          </DialogDescription>
        </DialogHeader>

        {!generatedContent ? (
          <div className="space-y-4 py-4">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">
                Topic <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic"
                placeholder="e.g., New product launch, Company update, Industry news..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Platform Selector */}
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(value) => setPlatform(value as Platform)}
                disabled={isGenerating}
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select
                value={contentType}
                onValueChange={(value) => setContentType(value as ContentType)}
                disabled={isGenerating}
              >
                <SelectTrigger id="contentType">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Keywords Input */}
            <div className="space-y-2">
              <Label htmlFor="keywords">
                Keywords
                <span className="text-muted-foreground text-xs ml-2">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="keywords"
                placeholder="innovation, AI, technology..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={isGenerating}
              />
              {keywordList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {keywordList.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Length Selector */}
            <div className="space-y-2">
              <Label>Content Length</Label>
              <div className="grid grid-cols-3 gap-3">
                {lengths.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLength(l.value)}
                    disabled={isGenerating}
                    className={`p-3 rounded-md border-2 transition-all ${
                      length === l.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="font-medium text-sm">{l.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {l.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Generated Content Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Generated Content</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={generatedContent.text}
                readOnly
                className="min-h-[200px] font-normal"
              />
              {generatedContent.hashtags.length > 0 && (
                <div className="space-y-2">
                  <Label>Hashtags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedContent.hashtags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-blue-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedContent ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleUseAgain}>
                Generate Again
              </Button>
              <Button onClick={handleSave}>
                Save & Use
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Sparkles, Save, Eye } from "lucide-react";

interface BrandVoice {
  tone?: string;
  style?: string;
  vocabulary?: string[];
  avoid?: string[];
  examplePosts?: string[];
}

interface BrandVoiceEditorProps {
  productId: string;
  initialBrandVoice?: BrandVoice | null;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
  { value: "playful", label: "Playful" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "conversational", label: "Conversational" },
];

const EXAMPLE_CONTENT = "Introducing our new feature that helps you save time and boost productivity!";

export function BrandVoiceEditor({ productId, initialBrandVoice }: BrandVoiceEditorProps) {
  const [brandVoice, setBrandVoice] = useState<BrandVoice>({
    tone: initialBrandVoice?.tone || "professional",
    style: initialBrandVoice?.style || "",
    vocabulary: initialBrandVoice?.vocabulary || [],
    avoid: initialBrandVoice?.avoid || [],
    examplePosts: initialBrandVoice?.examplePosts || [],
  });

  const [newVocabWord, setNewVocabWord] = useState("");
  const [newAvoidWord, setNewAvoidWord] = useState("");
  const [newExamplePost, setNewExamplePost] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (initialBrandVoice) {
      setBrandVoice({
        tone: initialBrandVoice.tone || "professional",
        style: initialBrandVoice.style || "",
        vocabulary: initialBrandVoice.vocabulary || [],
        avoid: initialBrandVoice.avoid || [],
        examplePosts: initialBrandVoice.examplePosts || [],
      });
    }
  }, [initialBrandVoice]);

  const handleAddVocabWord = () => {
    if (newVocabWord.trim() && !brandVoice.vocabulary?.includes(newVocabWord.trim())) {
      setBrandVoice({
        ...brandVoice,
        vocabulary: [...(brandVoice.vocabulary || []), newVocabWord.trim()],
      });
      setNewVocabWord("");
    }
  };

  const handleRemoveVocabWord = (word: string) => {
    setBrandVoice({
      ...brandVoice,
      vocabulary: brandVoice.vocabulary?.filter((w) => w !== word) || [],
    });
  };

  const handleAddAvoidWord = () => {
    if (newAvoidWord.trim() && !brandVoice.avoid?.includes(newAvoidWord.trim())) {
      setBrandVoice({
        ...brandVoice,
        avoid: [...(brandVoice.avoid || []), newAvoidWord.trim()],
      });
      setNewAvoidWord("");
    }
  };

  const handleRemoveAvoidWord = (word: string) => {
    setBrandVoice({
      ...brandVoice,
      avoid: brandVoice.avoid?.filter((w) => w !== word) || [],
    });
  };

  const handleAddExamplePost = () => {
    if (newExamplePost.trim()) {
      setBrandVoice({
        ...brandVoice,
        examplePosts: [...(brandVoice.examplePosts || []), newExamplePost.trim()],
      });
      setNewExamplePost("");
    }
  };

  const handleRemoveExamplePost = (index: number) => {
    setBrandVoice({
      ...brandVoice,
      examplePosts: brandVoice.examplePosts?.filter((_, i) => i !== index) || [],
    });
  };

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    setShowPreview(true);
    try {
      const response = await fetch(`/api/products/${productId}/brand-voice/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoice,
          content: EXAMPLE_CONTENT,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewContent(result.preview);
      } else {
        setPreviewContent("Failed to generate preview. Please try again.");
      }
    } catch (error) {
      console.error("Failed to generate preview:", error);
      setPreviewContent("Error generating preview. Please check your settings.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/brand-voice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandVoice }),
      });

      if (response.ok) {
        alert("Brand voice saved successfully!");
      } else {
        alert("Failed to save brand voice. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save brand voice:", error);
      alert("Error saving brand voice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tone Selection */}
      <div className="space-y-2">
        <Label htmlFor="tone">Brand Tone</Label>
        <Select
          value={brandVoice.tone}
          onValueChange={(value) => setBrandVoice({ ...brandVoice, tone: value })}
        >
          <SelectTrigger id="tone">
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            {TONE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          The overall tone your brand should convey in content
        </p>
      </div>

      {/* Style Description */}
      <div className="space-y-2">
        <Label htmlFor="style">Style Description</Label>
        <Textarea
          id="style"
          placeholder="Describe your brand's unique style, personality, and communication approach..."
          value={brandVoice.style}
          onChange={(e) => setBrandVoice({ ...brandVoice, style: e.target.value })}
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          Detailed description of how your brand communicates (e.g., "We use short,
          punchy sentences with occasional humor")
        </p>
      </div>

      {/* Vocabulary to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Vocabulary</CardTitle>
          <CardDescription>
            Words and phrases your brand frequently uses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a word or phrase..."
              value={newVocabWord}
              onChange={(e) => setNewVocabWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddVocabWord();
                }
              }}
            />
            <Button onClick={handleAddVocabWord} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {brandVoice.vocabulary && brandVoice.vocabulary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brandVoice.vocabulary.map((word) => (
                <Badge key={word} variant="secondary" className="gap-1 pl-2 pr-1">
                  {word}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveVocabWord(word)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Words to Avoid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Words to Avoid</CardTitle>
          <CardDescription>
            Words and phrases your brand should not use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a word or phrase to avoid..."
              value={newAvoidWord}
              onChange={(e) => setNewAvoidWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAvoidWord();
                }
              }}
            />
            <Button onClick={handleAddAvoidWord} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {brandVoice.avoid && brandVoice.avoid.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brandVoice.avoid.map((word) => (
                <Badge
                  key={word}
                  variant="destructive"
                  className="gap-1 pl-2 pr-1"
                >
                  {word}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveAvoidWord(word)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Example Posts</CardTitle>
          <CardDescription>
            Sample posts that exemplify your brand voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Paste an example post that represents your brand voice..."
              value={newExamplePost}
              onChange={(e) => setNewExamplePost(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddExamplePost} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Example
            </Button>
          </div>
          {brandVoice.examplePosts && brandVoice.examplePosts.length > 0 && (
            <div className="space-y-3">
              {brandVoice.examplePosts.map((post, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border p-4 pr-10"
                >
                  <p className="text-sm whitespace-pre-wrap">{post}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveExamplePost(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview Brand Voice</CardTitle>
          <CardDescription>
            See how content sounds with your brand voice settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-normal text-muted-foreground">
              Sample content: "{EXAMPLE_CONTENT}"
            </Label>
            <Button
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              variant="outline"
              className="w-full"
            >
              {isGeneratingPreview ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Generate Preview
                </>
              )}
            </Button>
          </div>
          {showPreview && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              {isGeneratingPreview ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded animate-pulse" />
                  <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-4/6" />
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{previewContent}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reset Changes
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Save className="mr-2 h-4 w-4 animate-pulse" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Brand Voice
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

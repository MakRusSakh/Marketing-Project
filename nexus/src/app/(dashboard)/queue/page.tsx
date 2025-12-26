"use client";

import { useState, useEffect } from "react";
import { Calendar, Filter, RefreshCw, Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueueItem, RescheduleModal } from "@/components/queue";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Publication {
  id: string;
  contentId: string;
  channelId: string;
  status: "scheduled" | "publishing" | "published" | "failed";
  scheduledAt?: Date | string;
  publishedAt?: Date | string;
  platformPostId?: string;
  platformUrl?: string;
  errorMessage?: string;
  content: {
    id: string;
    originalText: string;
    contentType: string;
  };
  channel: {
    id: string;
    platform: string;
    platformName?: string;
  };
}

export default function QueuePage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    publicationId?: string;
    currentDate?: Date | string;
  }>({ open: false });

  // Fetch publications
  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/publications");
      if (response.ok) {
        const data = await response.json();
        setPublications(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch publications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter publications
  const filteredPublications = publications
    .filter((pub) => {
      if (selectedStatus !== "all" && pub.status !== selectedStatus) return false;
      if (selectedPlatform !== "all" && pub.channel.platform !== selectedPlatform)
        return false;
      if (
        searchQuery &&
        !pub.content.originalText.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (dateFrom && pub.scheduledAt) {
        const schedDate = new Date(pub.scheduledAt);
        if (schedDate < new Date(dateFrom)) return false;
      }
      if (dateTo && pub.scheduledAt) {
        const schedDate = new Date(pub.scheduledAt);
        if (schedDate > new Date(dateTo)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledAt || a.publishedAt || 0);
      const dateB = new Date(b.scheduledAt || b.publishedAt || 0);
      return dateA.getTime() - dateB.getTime();
    });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredPublications.map((p) => p.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkCancel = async () => {
    if (!confirm(`Cancel ${selectedItems.size} publication(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map((id) =>
          fetch(`/api/publications/${id}`, {
            method: "DELETE",
          })
        )
      );
      setSelectedItems(new Set());
      fetchPublications();
    } catch (error) {
      console.error("Failed to cancel publications:", error);
    }
  };

  const handleView = (id: string) => {
    console.log("View publication:", id);
    // Navigate to publication details or open modal
  };

  const handleEdit = (id: string) => {
    console.log("Edit publication:", id);
    // Navigate to edit page
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this publication?")) return;

    try {
      await fetch(`/api/publications/${id}`, {
        method: "DELETE",
      });
      fetchPublications();
    } catch (error) {
      console.error("Failed to cancel publication:", error);
    }
  };

  const handleReschedule = (id: string) => {
    const publication = publications.find((p) => p.id === id);
    if (publication) {
      setRescheduleModal({
        open: true,
        publicationId: id,
        currentDate: publication.scheduledAt,
      });
    }
  };

  const handleRescheduleConfirm = async (newDate: Date) => {
    if (!rescheduleModal.publicationId) return;

    try {
      await fetch(`/api/publications/${rescheduleModal.publicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newDate.toISOString() }),
      });
      setRescheduleModal({ open: false });
      fetchPublications();
    } catch (error) {
      console.error("Failed to reschedule publication:", error);
    }
  };

  const platforms = Array.from(
    new Set(publications.map((p) => p.channel.platform))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage scheduled and published content
          </p>
        </div>
        <Button onClick={fetchPublications} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-border space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Platform Filter */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={selectedPlatform}
              onValueChange={setSelectedPlatform}
            >
              <SelectTrigger id="platform">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedItems.size === filteredPublications.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedItems.size} item(s) selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkCancel}>
              Cancel Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Loading publications...
            </p>
          </div>
        ) : filteredPublications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No publications found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {publications.length === 0
                ? "Schedule your first publication to get started"
                : "Try adjusting your filters"}
            </p>
            {publications.length === 0 && (
              <Button>Create Publication</Button>
            )}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={
                  filteredPublications.length > 0 &&
                  selectedItems.size === filteredPublications.length
                }
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm text-muted-foreground cursor-pointer">
                Select all
              </Label>
            </div>

            {/* Publications */}
            {filteredPublications.map((publication) => (
              <div key={publication.id} className="flex items-start gap-3">
                <Checkbox
                  checked={selectedItems.has(publication.id)}
                  onCheckedChange={(checked) =>
                    handleSelectItem(publication.id, checked as boolean)
                  }
                  className="mt-6"
                />
                <div className="flex-1">
                  <QueueItem
                    publication={publication}
                    onView={handleView}
                    onEdit={handleEdit}
                    onCancel={handleCancel}
                    onReschedule={handleReschedule}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        open={rescheduleModal.open}
        onOpenChange={(open) => setRescheduleModal({ open })}
        currentDate={rescheduleModal.currentDate}
        onReschedule={handleRescheduleConfirm}
      />
    </div>
  );
}

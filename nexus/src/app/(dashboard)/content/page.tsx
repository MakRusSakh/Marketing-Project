"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCard, AIGenerationModal } from "@/components/content";
import {
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Sparkles,
  Loader2,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Content {
  id: string;
  originalText: string;
  contentType: string;
  status: "draft" | "ready" | "published" | "archived";
  createdAt: string;
  adapted?: Record<string, unknown>;
  publications?: Array<{
    id: string;
    channelId: string;
    status: string;
  }>;
  _count?: {
    publications: number;
  };
}

export default function ContentListPage() {
  const router = useRouter();
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAIModal, setShowAIModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const productId = "default-product-id";

  useEffect(() => {
    fetchContents();
  }, [page, statusFilter, typeFilter]);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        productId,
        page: page.toString(),
        limit: "12",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (typeFilter !== "all") {
        params.append("contentType", typeFilter);
      }

      const response = await fetch(`/api/content?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch contents");
      }

      const data = await response.json();
      setContents(data.content || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching contents:", error);
      setContents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push("/content/new");
  };

  const handleEdit = (id: string) => {
    router.push(`/content/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    const content = contents.find((c) => c.id === id);
    if (!content) return;

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          originalText: content.originalText,
          contentType: content.contentType,
          status: "draft",
          adapted: content.adapted,
        }),
      });

      if (response.ok) {
        fetchContents();
      }
    } catch (error) {
      console.error("Error duplicating content:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот контент?")) return;

    try {
      const response = await fetch(`/api/content/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchContents();
      }
    } catch (error) {
      console.error("Error deleting content:", error);
    }
  };

  const handleAIGenerated = (generatedData: {
    text: string;
    hashtags: string[];
    platform: string;
    contentType: string;
  }) => {
    router.push(
      `/content/new?text=${encodeURIComponent(generatedData.text)}&platform=${generatedData.platform}&hashtags=${encodeURIComponent(generatedData.hashtags.join(","))}`
    );
  };

  const filteredContents = contents.filter((content) => {
    if (searchQuery.trim() === "") return true;
    return content.originalText
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const getPlatformsFromContent = (content: Content): string[] => {
    if (!content.adapted) return [];
    return Object.keys(content.adapted);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Контент-студия</h1>
          <p className="text-muted-foreground mt-1">
            Создавайте и управляйте контентом для всех платформ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowAIModal(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            ИИ генерация
          </Button>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Создать контент
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Всего контента</div>
            <div className="text-2xl font-bold mt-1">{total}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Черновики</div>
            <div className="text-2xl font-bold mt-1">
              {contents.filter((c) => c.status === "draft").length}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Готово</div>
            <div className="text-2xl font-bold mt-1">
              {contents.filter((c) => c.status === "ready").length}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Опубликовано</div>
            <div className="text-2xl font-bold mt-1">
              {contents.filter((c) => c.status === "published").length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск контента..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="draft">Черновик</SelectItem>
              <SelectItem value="ready">Готово</SelectItem>
              <SelectItem value="published">Опубликовано</SelectItem>
              <SelectItem value="archived">В архиве</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="post">Пост</SelectItem>
              <SelectItem value="article">Статья</SelectItem>
              <SelectItem value="tweet">Твит</SelectItem>
              <SelectItem value="story">Сторис</SelectItem>
              <SelectItem value="announcement">Анонс</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Контента пока нет
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? "Контент не найден. Попробуйте изменить фильтры поиска."
              : "Начните с создания первого контента или используйте ИИ для автоматической генерации."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAIModal(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              ИИ генерация
            </Button>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать контент
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                id={content.id}
                preview={content.originalText}
                status={content.status}
                platforms={getPlatformsFromContent(content)}
                createdAt={content.createdAt}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Назад
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    {page > 5 && <span className="px-2">...</span>}
                    {page > 5 && (
                      <Button
                        variant={page === totalPages ? "default" : "outline"}
                        onClick={() => setPage(totalPages)}
                        className="w-10"
                      >
                        {totalPages}
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}

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

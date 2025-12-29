"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutomationCard } from "@/components/automations";
import { Label } from "@/components/ui/label";

interface Automation {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: any;
  actions: any;
  enabled: boolean;
  lastTriggered?: Date | string;
  triggerCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function AutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch automations
  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/automations");
      if (response.ok) {
        const data = await response.json();
        setAutomations(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch automations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter automations
  const filteredAutomations = automations
    .filter((automation) => {
      if (
        selectedTriggerType !== "all" &&
        automation.triggerType !== selectedTriggerType
      )
        return false;
      if (selectedStatus === "enabled" && !automation.enabled) return false;
      if (selectedStatus === "disabled" && automation.enabled) return false;
      if (
        searchQuery &&
        !automation.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !automation.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by enabled status first, then by name
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // Handlers
  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setAutomations((prev) =>
          prev.map((auto) => (auto.id === id ? { ...auto, enabled } : auto))
        );
      }
    } catch (error) {
      console.error("Failed to toggle automation:", error);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/automations/${id}/edit`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const automation = automations.find((a) => a.id === id);
      if (!automation) return;

      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...automation,
          id: undefined,
          name: `${automation.name} (Копия)`,
          enabled: false,
        }),
      });

      if (response.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error("Failed to duplicate automation:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту автоматизацию?")) return;

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAutomations((prev) => prev.filter((auto) => auto.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete automation:", error);
    }
  };

  const handleViewLogs = (id: string) => {
    router.push(`/automations/${id}/logs`);
  };

  const stats = {
    total: automations.length,
    enabled: automations.filter((a) => a.enabled).length,
    disabled: automations.filter((a) => !a.enabled).length,
    totalRuns: automations.reduce((sum, a) => sum + a.triggerCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Автоматизации</h1>
          <p className="mt-1 text-sm text-gray-600">
            Автоматизируйте рабочие процессы с контентом с помощью триггеров и действий
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAutomations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={() => router.push("/automations/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Создать автоматизацию
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Всего</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Активные</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.enabled}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Отключённые</p>
          <p className="text-2xl font-bold mt-1 text-gray-400">
            {stats.disabled}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Всего запусков</p>
          <p className="text-2xl font-bold mt-1">{stats.totalRuns}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trigger Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="triggerType">Тип триггера</Label>
            <Select
              value={selectedTriggerType}
              onValueChange={setSelectedTriggerType}
            >
              <SelectTrigger id="triggerType">
                <SelectValue placeholder="Все типы триггеров" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы триггеров</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="schedule">Расписание</SelectItem>
                <SelectItem value="event">Событие</SelectItem>
                <SelectItem value="manual">Вручную</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="enabled">Активные</SelectItem>
                <SelectItem value="disabled">Отключённые</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Поиск</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Поиск автоматизаций..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Automations List */}
      <div>
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Загрузка автоматизаций...
            </p>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {automations.length === 0
                ? "Автоматизаций пока нет"
                : "Автоматизации не найдены"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {automations.length === 0
                ? "Создайте первую автоматизацию для оптимизации рабочих процессов"
                : "Попробуйте изменить фильтры"}
            </p>
            {automations.length === 0 && (
              <Button onClick={() => router.push("/automations/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Создать автоматизацию
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAutomations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onViewLogs={handleViewLogs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

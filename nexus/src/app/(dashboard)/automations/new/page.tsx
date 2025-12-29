"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Webhook,
  Calendar,
  Activity,
  Zap,
  Plus,
  X,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  MessageSquare,
  Bell,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AutomationFormData {
  name: string;
  description: string;
  productId: string;
  triggerType: string;
  triggerConfig: any;
  conditions: any[];
  actions: any[];
}

const STEPS = [
  { id: 1, name: "Основные данные", icon: MessageSquare },
  { id: 2, name: "Триггер", icon: Zap },
  { id: 3, name: "Условия", icon: Activity },
  { id: 4, name: "Действия", icon: Bell },
  { id: 5, name: "Проверка", icon: Check },
];

const TRIGGER_TYPES = [
  {
    id: "webhook",
    name: "Webhook",
    description: "Запуск при получении webhook",
    icon: Webhook,
  },
  {
    id: "schedule",
    name: "Расписание",
    description: "Запуск по расписанию",
    icon: Calendar,
  },
  {
    id: "event",
    name: "Событие",
    description: "Запуск при наступлении события",
    icon: Activity,
  },
];

const ACTION_TYPES = [
  {
    id: "generate_content",
    name: "Генерация контента",
    description: "Генерация контента с помощью ИИ",
    icon: MessageSquare,
  },
  {
    id: "publish_to_platform",
    name: "Публикация на платформу",
    description: "Публикация контента в социальной сети",
    icon: Twitter,
  },
  {
    id: "schedule_publication",
    name: "Запланировать публикацию",
    description: "Запланировать контент для публикации",
    icon: Calendar,
  },
  {
    id: "send_notification",
    name: "Отправить уведомление",
    description: "Отправить email или webhook уведомление",
    icon: Bell,
  },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AutomationFormData>({
    name: "",
    description: "",
    productId: "",
    triggerType: "",
    triggerConfig: {},
    conditions: [],
    actions: [],
  });

  const updateFormData = (updates: Partial<AutomationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/automations");
      } else {
        console.error("Failed to create automation");
      }
    } catch (error) {
      console.error("Failed to create automation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== "";
      case 2:
        return formData.triggerType !== "";
      case 3:
        return true; // Conditions are optional
      case 4:
        return formData.actions.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/automations")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Назад к автоматизациям
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Создать автоматизацию</h1>
        <p className="mt-1 text-sm text-gray-600">
          Настройте автоматизированные рабочие процессы для вашего контента
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Шаг {currentStep} из {STEPS.length}
          </span>
          <span className="text-muted-foreground">{STEPS[currentStep - 1].name}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isActive &&
                      "border-primary bg-primary text-primary-foreground",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-gray-300 bg-white"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 font-medium",
                    isActive && "text-primary",
                    !isActive && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 -mt-8",
                    isCompleted ? "bg-primary" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Основная информация</h2>
                <p className="text-sm text-muted-foreground">
                  Укажите основные данные вашей автоматизации
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название автоматизации *</Label>
                  <Input
                    id="name"
                    placeholder="например, Автопост в Twitter при новом релизе"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    placeholder="Опишите, что делает эта автоматизация..."
                    value={formData.description}
                    onChange={(e) =>
                      updateFormData({ description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Продукт</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) =>
                      updateFormData({ productId: value })
                    }
                  >
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Выберите продукт" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Продукт по умолчанию</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Trigger */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Выберите триггер</h2>
                <p className="text-sm text-muted-foreground">
                  Выберите, что будет запускать эту автоматизацию
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TRIGGER_TYPES.map((trigger) => {
                  const TriggerIcon = trigger.icon;
                  const isSelected = formData.triggerType === trigger.id;

                  return (
                    <button
                      key={trigger.id}
                      onClick={() =>
                        updateFormData({
                          triggerType: trigger.id,
                          triggerConfig: {},
                        })
                      }
                      className={cn(
                        "p-4 border-2 rounded-lg text-left transition-all hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <TriggerIcon
                          className={cn(
                            "h-6 w-6",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <h3 className="font-medium mb-1">{trigger.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {trigger.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Trigger Configuration */}
              {formData.triggerType === "schedule" && (
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <h3 className="font-medium">Настройка расписания</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Частота</Label>
                      <Select
                        value={formData.triggerConfig.frequency || ""}
                        onValueChange={(value) =>
                          updateFormData({
                            triggerConfig: {
                              ...formData.triggerConfig,
                              frequency: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите частоту" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Ежечасно</SelectItem>
                          <SelectItem value="daily">Ежедневно</SelectItem>
                          <SelectItem value="weekly">Еженедельно</SelectItem>
                          <SelectItem value="monthly">Ежемесячно</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Время</Label>
                      <Input
                        type="time"
                        value={formData.triggerConfig.time || ""}
                        onChange={(e) =>
                          updateFormData({
                            triggerConfig: {
                              ...formData.triggerConfig,
                              time: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.triggerType === "webhook" && (
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <h3 className="font-medium">Настройка Webhook</h3>
                  <div className="space-y-2">
                    <Label>Тип события</Label>
                    <Input
                      placeholder="например, product.released"
                      value={formData.triggerConfig.eventType || ""}
                      onChange={(e) =>
                        updateFormData({
                          triggerConfig: {
                            ...formData.triggerConfig,
                            eventType: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {formData.triggerType === "event" && (
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <h3 className="font-medium">Настройка события</h3>
                  <div className="space-y-2">
                    <Label>Тип события</Label>
                    <Select
                      value={formData.triggerConfig.eventType || ""}
                      onValueChange={(value) =>
                        updateFormData({
                          triggerConfig: {
                            ...formData.triggerConfig,
                            eventType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите событие" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content.created">
                          Контент создан
                        </SelectItem>
                        <SelectItem value="content.published">
                          Контент опубликован
                        </SelectItem>
                        <SelectItem value="publication.failed">
                          Публикация не удалась
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Conditions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Условия (необязательно)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Добавьте условия для контроля выполнения действий
                </p>
              </div>

              {formData.conditions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Условия не добавлены. Действия будут выполняться всегда при срабатывании триггера.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateFormData({
                        conditions: [
                          ...formData.conditions,
                          { field: "", operator: "equals", value: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить условие
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Поле</Label>
                            <Input
                              placeholder="например, platform"
                              value={condition.field}
                              onChange={(e) => {
                                const newConditions = [...formData.conditions];
                                newConditions[index].field = e.target.value;
                                updateFormData({ conditions: newConditions });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Оператор</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => {
                                const newConditions = [...formData.conditions];
                                newConditions[index].operator = value;
                                updateFormData({ conditions: newConditions });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Равно</SelectItem>
                                <SelectItem value="not_equals">
                                  Не равно
                                </SelectItem>
                                <SelectItem value="contains">Содержит</SelectItem>
                                <SelectItem value="starts_with">
                                  Начинается с
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Значение</Label>
                            <Input
                              placeholder="Значение"
                              value={condition.value}
                              onChange={(e) => {
                                const newConditions = [...formData.conditions];
                                newConditions[index].value = e.target.value;
                                updateFormData({ conditions: newConditions });
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newConditions = formData.conditions.filter(
                              (_, i) => i !== index
                            );
                            updateFormData({ conditions: newConditions });
                          }}
                          className="mt-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateFormData({
                        conditions: [
                          ...formData.conditions,
                          { field: "", operator: "equals", value: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить ещё условие
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Actions */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Настройка действий</h2>
                <p className="text-sm text-muted-foreground">
                  Выберите, что произойдёт при срабатывании этой автоматизации
                </p>
              </div>

              {formData.actions.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4 border-2 border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">
                      Действия не настроены. Добавьте хотя бы одно действие.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ACTION_TYPES.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() =>
                            updateFormData({
                              actions: [
                                ...formData.actions,
                                { type: action.id, config: {} },
                              ],
                            })
                          }
                          className="p-4 border-2 border-border rounded-lg text-left hover:border-primary/50 hover:shadow-md transition-all"
                        >
                          <ActionIcon className="h-6 w-6 text-muted-foreground mb-2" />
                          <h3 className="font-medium mb-1">{action.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.actions.map((action, index) => {
                    const actionType = ACTION_TYPES.find(
                      (a) => a.id === action.type
                    );
                    const ActionIcon = actionType?.icon || Bell;

                    return (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ActionIcon className="h-5 w-5 text-primary" />
                            <h3 className="font-medium">{actionType?.name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newActions = formData.actions.filter(
                                (_, i) => i !== index
                              );
                              updateFormData({ actions: newActions });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Action-specific config */}
                        {action.type === "generate_content" && (
                          <div className="space-y-2">
                            <Label>Промпт для ИИ</Label>
                            <Textarea
                              placeholder="Введите промпт для генерации контента..."
                              value={action.config.prompt || ""}
                              onChange={(e) => {
                                const newActions = [...formData.actions];
                                newActions[index].config.prompt = e.target.value;
                                updateFormData({ actions: newActions });
                              }}
                              rows={3}
                            />
                          </div>
                        )}

                        {action.type === "publish_to_platform" && (
                          <div className="space-y-2">
                            <Label>Платформа</Label>
                            <Select
                              value={action.config.platform || ""}
                              onValueChange={(value) => {
                                const newActions = [...formData.actions];
                                newActions[index].config.platform = value;
                                updateFormData({ actions: newActions });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите платформу" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="twitter">Twitter</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.type === "schedule_publication" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Задержка (часы)</Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={action.config.delayHours || ""}
                                onChange={(e) => {
                                  const newActions = [...formData.actions];
                                  newActions[index].config.delayHours =
                                    e.target.value;
                                  updateFormData({ actions: newActions });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Платформа</Label>
                              <Select
                                value={action.config.platform || ""}
                                onValueChange={(value) => {
                                  const newActions = [...formData.actions];
                                  newActions[index].config.platform = value;
                                  updateFormData({ actions: newActions });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите платформу" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="twitter">Twitter</SelectItem>
                                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                                  <SelectItem value="facebook">Facebook</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {action.type === "send_notification" && (
                          <div className="space-y-2">
                            <Label>Текст уведомления</Label>
                            <Textarea
                              placeholder="Введите текст уведомления..."
                              value={action.config.message || ""}
                              onChange={(e) => {
                                const newActions = [...formData.actions];
                                newActions[index].config.message = e.target.value;
                                updateFormData({ actions: newActions });
                              }}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    variant="outline"
                    onClick={() => {
                      // Show action selector in a simple way
                      const actionId = prompt(
                        "Введите тип действия:\n1. generate_content (Генерация контента)\n2. publish_to_platform (Публикация)\n3. schedule_publication (Планирование)\n4. send_notification (Уведомление)"
                      );
                      const actionMap: Record<string, string> = {
                        "1": "generate_content",
                        "2": "publish_to_platform",
                        "3": "schedule_publication",
                        "4": "send_notification",
                      };
                      const selectedAction = actionMap[actionId || ""];
                      if (selectedAction) {
                        updateFormData({
                          actions: [
                            ...formData.actions,
                            { type: selectedAction, config: {} },
                          ],
                        });
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить ещё действие
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Проверка и подтверждение</h2>
                <p className="text-sm text-muted-foreground">
                  Проверьте конфигурацию автоматизации перед созданием
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-medium mb-3">Основная информация</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Название:</dt>
                      <dd className="font-medium">{formData.name}</dd>
                    </div>
                    {formData.description && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Описание:</dt>
                        <dd className="font-medium text-right max-w-xs">
                          {formData.description}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-medium mb-3">Триггер</h3>
                  <Badge variant="outline" className="mb-2">
                    {TRIGGER_TYPES.find((t) => t.id === formData.triggerType)
                      ?.name || "Unknown"}
                  </Badge>
                  {Object.keys(formData.triggerConfig).length > 0 && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(formData.triggerConfig, null, 2)}
                    </pre>
                  )}
                </div>

                {formData.conditions.length > 0 && (
                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="font-medium mb-3">Условия</h3>
                    <div className="space-y-2">
                      {formData.conditions.map((condition, index) => (
                        <div
                          key={index}
                          className="text-sm bg-muted p-2 rounded"
                        >
                          {condition.field} {condition.operator} {condition.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-medium mb-3">Действия</h3>
                  <div className="space-y-2">
                    {formData.actions.map((action, index) => (
                      <div key={index} className="text-sm bg-muted p-3 rounded">
                        <div className="font-medium mb-1">
                          {ACTION_TYPES.find((a) => a.id === action.type)?.name}
                        </div>
                        {Object.keys(action.config).length > 0 && (
                          <pre className="text-xs opacity-70">
                            {JSON.stringify(action.config, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/automations")}
          >
            Отмена
          </Button>
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Далее
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать автоматизацию"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

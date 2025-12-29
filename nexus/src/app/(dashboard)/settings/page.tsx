// Force dynamic rendering - this page needs database access
export const dynamic = 'force-dynamic';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BrandVoiceEditor } from "@/components/settings/brand-voice-editor";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Package,
  Rss,
  MessageSquare,
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

async function getProducts() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      channels: {
        select: {
          id: true,
          platform: true,
          status: true,
        },
      },
      _count: {
        select: {
          contents: true,
          automations: true,
        },
      },
    },
  });
  return products;
}

async function getChannels() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
  return channels;
}

async function getSettings() {
  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, any> = {};
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });
  return settingsMap;
}

export default async function SettingsPage() {
  const products = await getProducts();
  const channels = await getChannels();
  const settings = await getSettings();

  // Group channels by platform
  const channelsByPlatform = channels.reduce((acc, channel) => {
    if (!acc[channel.platform]) {
      acc[channel.platform] = [];
    }
    acc[channel.platform].push(channel);
    return acc;
  }, {} as Record<string, typeof channels>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Настройки</h1>
        <p className="mt-2 text-muted-foreground">
          Управление продуктами, каналами, голосом бренда и настройками платформы
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Продукты</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Rss className="h-4 w-4" />
            <span className="hidden sm:inline">Каналы</span>
          </TabsTrigger>
          <TabsTrigger value="brand-voice" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Голос бренда</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Общие</span>
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Продукты</CardTitle>
                <CardDescription>
                  Управление вашими продуктами и их настройками
                </CardDescription>
              </div>
              <Link href="/settings/products">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить продукт
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Продуктов пока нет</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Начните с создания первого продукта.
                  </p>
                  <Link href="/settings/products">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Создать продукт
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{product.name}</h4>
                          <Badge variant="outline">{product.slug}</Badge>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{product._count.contents} контента</span>
                          <span>{product._count.automations} автоматизаций</span>
                          <span>{product.channels.length} каналов</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/settings/products?edit=${product.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Подключённые каналы</CardTitle>
                <CardDescription>
                  Управление подключениями к социальным сетям
                </CardDescription>
              </div>
              <Link href="/settings/channels">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Подключить канал
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {channels.length === 0 ? (
                <div className="text-center py-12">
                  <Rss className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Каналы не подключены</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Подключите первый канал в социальных сетях для начала публикации.
                  </p>
                  <Link href="/settings/channels">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Подключить канал
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(channelsByPlatform).map(([platform, platformChannels]) => (
                    <div key={platform}>
                      <h4 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                        {platform}
                      </h4>
                      <div className="space-y-2">
                        {platformChannels.map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">
                                    {channel.platformName || channel.platform}
                                  </h5>
                                  {channel.status === "active" && (
                                    <Badge className="bg-green-500">
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Активен
                                    </Badge>
                                  )}
                                  {channel.status === "error" && (
                                    <Badge variant="destructive">
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Ошибка
                                    </Badge>
                                  )}
                                  {channel.status === "inactive" && (
                                    <Badge variant="secondary">
                                      <Clock className="mr-1 h-3 w-3" />
                                      Неактивен
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Продукт: {channel.product.name}
                                </p>
                                {channel.errorMessage && (
                                  <p className="text-sm text-destructive">
                                    {channel.errorMessage}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                Проверить соединение
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Voice Tab */}
        <TabsContent value="brand-voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Голос бренда</CardTitle>
              <CardDescription>
                Настройка голоса бренда и стиля контента
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Продукты недоступны</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Сначала создайте продукт, чтобы настроить голос бренда.
                  </p>
                  <Link href="/settings/products">
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Создать продукт
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="product-select">Выберите продукт</Label>
                    <select
                      id="product-select"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <BrandVoiceEditor
                    productId={products[0].id}
                    initialBrandVoice={products[0].brandVoice as any}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API ключи</CardTitle>
              <CardDescription>
                Управление API ключами и интеграциями
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic-key">API ключ Anthropic</Label>
                <div className="flex gap-2">
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder="sk-ant-..."
                    defaultValue={settings.anthropicApiKey || ""}
                  />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Используется для генерации контента с помощью ИИ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-key">API ключ OpenAI (опционально)</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    defaultValue={settings.openaiApiKey || ""}
                  />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Альтернативный ИИ-провайдер для генерации контента
                </p>
              </div>

              <div className="flex justify-end">
                <Button>Сохранить API ключи</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>
                Настройка ваших уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать email обновления о публикациях и автоматизациях
                  </p>
                </div>
                <Switch defaultChecked={settings.emailNotifications || false} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Оповещения о публикациях</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления при успешной публикации контента
                  </p>
                </div>
                <Switch defaultChecked={settings.publicationAlerts || true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Уведомления об ошибках</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать оповещения при сбоях публикаций или автоматизаций
                  </p>
                </div>
                <Switch defaultChecked={settings.errorNotifications || true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Еженедельный отчёт</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать еженедельную сводку вашей активности
                  </p>
                </div>
                <Switch defaultChecked={settings.weeklySummary || false} />
              </div>

              <div className="flex justify-end">
                <Button>Сохранить настройки</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Настройки очереди</CardTitle>
              <CardDescription>
                Настройка фоновой обработки задач
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retry-attempts">Максимум повторных попыток</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={settings.maxRetryAttempts || 3}
                />
                <p className="text-sm text-muted-foreground">
                  Количество повторных попыток для неудачных публикаций
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-delay">Задержка между попытками (секунды)</Label>
                <Input
                  id="retry-delay"
                  type="number"
                  min="0"
                  defaultValue={settings.retryDelay || 60}
                />
                <p className="text-sm text-muted-foreground">
                  Время ожидания между повторными попытками
                </p>
              </div>

              <div className="flex justify-end">
                <Button>Сохранить настройки</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

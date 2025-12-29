"use client";

import { useState } from "react";
import { format, addHours, addDays, addWeeks } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
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

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate?: Date | string;
  onReschedule: (newDate: Date) => void;
  isLoading?: boolean;
}

export function RescheduleModal({
  open,
  onOpenChange,
  currentDate,
  onReschedule,
  isLoading = false,
}: RescheduleModalProps) {
  const initialDate = currentDate ? new Date(currentDate) : new Date();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(initialDate, "yyyy-MM-dd")
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    format(initialDate, "HH:mm")
  );

  const handleQuickSelect = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setSelectedTime(format(date, "HH:mm"));
  };

  const handleConfirm = () => {
    const combinedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    onReschedule(combinedDateTime);
  };

  const quickOptions = [
    {
      label: "Через 1 час",
      date: addHours(new Date(), 1),
    },
    {
      label: "Через 3 часа",
      date: addHours(new Date(), 3),
    },
    {
      label: "Завтра в 9:00",
      date: (() => {
        const tomorrow = addDays(new Date(), 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      })(),
    },
    {
      label: "Завтра в 14:00",
      date: (() => {
        const tomorrow = addDays(new Date(), 1);
        tomorrow.setHours(14, 0, 0, 0);
        return tomorrow;
      })(),
    },
    {
      label: "Через неделю",
      date: addWeeks(new Date(), 1),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Перенести публикацию</DialogTitle>
          <DialogDescription>
            Выберите новую дату и время для этой публикации
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Time Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Быстрый выбор</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(option.date)}
                  className="justify-start text-sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Дата
            </Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10"
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">
              Время
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Новое время публикации:
            </p>
            <p className="text-sm font-medium">
              {format(new Date(`${selectedDate}T${selectedTime}`), "PPpp")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Переносим..." : "Перенести"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

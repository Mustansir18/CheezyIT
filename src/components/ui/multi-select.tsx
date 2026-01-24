'use client';

import * as React from 'react';
import { ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export type MultiSelectOption = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  mode?: 'single' | 'multiple';
  disabled?: boolean;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ options, selected, onChange, className, placeholder = "Select...", mode = "multiple", disabled = false }, ref) => {

    const handleSelect = (optionValue: string) => {
      if (disabled) return;
      let newSelected: string[];
      if (mode === 'single') {
        newSelected = selected.includes(optionValue) ? [] : [optionValue];
      } else {
        if (selected.includes(optionValue)) {
          newSelected = selected.filter((item) => item !== optionValue);
        } else {
          newSelected = [...selected, optionValue];
        }
      }
      onChange(newSelected);
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between h-auto min-h-10 px-3 py-2', className)}
            disabled={disabled}
          >
            <div className="flex gap-1 flex-wrap items-center">
              {selected.length > 0 ? (
                options
                  .filter((option) => selected.includes(option.value))
                  .map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="flex items-center gap-1"
                    >
                      {option.label}
                      <X
                        className={cn("h-3 w-3", !disabled && "cursor-pointer hover:text-destructive")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option.value);
                        }}
                      />
                    </Badge>
                  ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <ScrollArea className="max-h-72">
            <div className="p-2 space-y-1">
              {options.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`ms-option-${option.value}`}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    id={`ms-option-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => handleSelect(option.value)}
                  />
                  <span
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }
);
MultiSelect.displayName = 'MultiSelect';

export { MultiSelect };

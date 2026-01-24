'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

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
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ options, selected, onChange, className, placeholder = "Select..." }, ref) => {

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={true}
            className={cn('w-full justify-between h-auto min-h-10', className)}
          >
            <div className="flex gap-1 flex-wrap">
              {selected.length > 0 ? (
                options
                  .filter((option) => selected.includes(option.value))
                  .map((option) => (
                    <Badge variant="secondary" key={option.value}>
                      {option.label}
                    </Badge>
                  ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <ScrollArea className="max-h-72">
            <div className="p-2 space-y-1">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center p-2 rounded-md"
                >
                  <Checkbox
                    id={`multi-select-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) => {
                        const isChecked = !!checked;
                        const newSelected = isChecked
                            ? [...selected, option.value]
                            : selected.filter((item) => item !== option.value);
                        onChange(newSelected);
                    }}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`multi-select-${option.value}`}
                    className="w-full text-sm font-medium cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
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

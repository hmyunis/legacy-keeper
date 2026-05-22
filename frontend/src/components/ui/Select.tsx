import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef, type ReactNode } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cx(
      'flex min-h-[48px] w-full items-center justify-between gap-3 rounded-full border border-[rgba(184,143,91,0.38)] bg-[var(--clr-linen)] px-5 py-3 text-left font-ui text-[13px] font-semibold text-[var(--clr-ink)] shadow-[var(--shadow-inset)] outline-none transition-all hover:border-[var(--clr-gold)] focus:border-[var(--clr-gold)] focus:shadow-[0_0_0_3px_rgba(184,143,91,0.16)] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--clr-dust)]',
      className,
    )}
    {...props}
  >
    <span className="min-w-0 flex-1 truncate">{children}</span>
    <SelectPrimitive.Icon asChild>
      <CaretDown className="shrink-0 text-[var(--clr-gold-dark)]" size={16} weight="bold" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={8}
      className={cx(
        'z-[10050] max-h-[min(320px,calc(100vh-32px))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(184,143,91,0.45)] bg-[var(--clr-linen)] text-[var(--clr-ink)] shadow-[0_18px_54px_rgba(20,18,17,0.32)] backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cx(
      'relative flex min-h-10 cursor-pointer select-none items-center rounded-[var(--radius-md)] py-2 pl-9 pr-3 font-ui text-[12px] font-bold text-[var(--clr-ink)] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-[var(--clr-gold-muted)] data-[highlighted]:text-[var(--clr-gold-dark)]',
      className,
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center text-[var(--clr-gold-dark)]">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} weight="bold" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export interface PlatformSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface PlatformSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  options: PlatformSelectOption[];
  className?: string;
  disabled?: boolean;
}

export function PlatformSelect({
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder = 'Select an option',
  options,
  className,
  disabled,
}: PlatformSelectProps) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

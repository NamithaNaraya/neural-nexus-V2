import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-13 w-full rounded-[20px] border border-border/50 bg-secondary/30 px-5 py-3 text-base font-medium transition-all duration-300',
        'placeholder:text-muted-foreground/40 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]',
        'focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'backdrop-blur-md shadow-sm',
        className
      )}
      {...props}
    />
  );
});


export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

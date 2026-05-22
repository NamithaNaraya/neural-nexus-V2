import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const iconButtonVariants = {
  variant: {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    emerald: 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm shadow-primary/10',
  },
  size: {
    default: 'h-10 w-10',
    sm: 'h-8 w-8',
    lg: 'h-12 w-12',
    xs: 'h-6 w-6 p-1',
  },
};

export const IconButton = forwardRef(function IconButton(
  { className, variant = 'default', size = 'default', icon, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95',
        iconButtonVariants.variant[variant],
        iconButtonVariants.size[size],
        className
      )}
      {...props}
    >
      {icon || children}
    </button>
  );
});

IconButton.displayName = 'IconButton';

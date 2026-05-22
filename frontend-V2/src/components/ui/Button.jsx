import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const buttonVariants = {
  variant: {
    default: 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/10',
    outline: 'border border-border/60 bg-transparent hover:bg-secondary/50 hover:text-primary hover:border-primary/40',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40',
    ghost: 'hover:bg-primary/10 hover:text-primary',
    link: 'text-primary underline-offset-4 hover:underline font-bold',
    botany: 'bg-accent/10 text-primary hover:bg-accent/20 border border-accent/20',
    gradient: 'bg-gradient-to-br from-primary to-accent text-white hover:opacity-95 shadow-lg shadow-primary/20 border-none',
  },
  size: {
    default: 'h-11 px-6 py-2',
    sm: 'h-9 rounded-xl px-4 text-xs',
    lg: 'h-13 rounded-[20px] px-10 text-base font-black tracking-tight',
    icon: 'h-10 w-10 p-0',
  },
};

export const Button = forwardRef(function Button(
  {
    className,
    variant = 'default',
    size = 'default',
    type = 'button',
    disabled,
    children,
    as: Component = 'button',
    ...props
  },
  ref
) {
  const Comp = Component;
  const buttonProps = Comp === 'button' ? { type } : {};
  return (
    <Comp
      ref={ref}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]',
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      disabled={disabled}
      {...buttonProps}
      {...props}
    >
      {children}
    </Comp>
  );
});

Button.displayName = 'Button';

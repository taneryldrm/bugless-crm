import React from 'react';
import { cva } from 'class-variance-authority';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Note: If you don't have class-variance-authority, clsx, tailwind-merge installed, 
// I will just use simple template literals or ensure they are present.
// Since I cannot easily install packages without user permission and to be safe/lightweight, 
// I will implement a simpler version without 'cva' dependency if it's not in package.json, 
// OR I'll check package.json first. 
// actually checking package.json is safer.

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'default', 
  isLoading = false,
  disabled,
  children, 
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white dark:ring-offset-slate-950";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
    secondary: "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-sm",
    outline: "border border-primary text-primary hover:bg-blue-50 dark:hover:bg-slate-800",
    ghost: "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    link: "text-primary underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md text-sm",
    lg: "h-11 px-8 rounded-md text-lg",
    icon: "h-10 w-10",
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.default;

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${currentVariant} ${currentSize} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };

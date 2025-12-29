import React from 'react';

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
  destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
  outline: "text-gray-950 border-gray-200",
  success: "border-transparent bg-green-500 text-white hover:bg-green-600",
  warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
};

function Badge({ className, variant = "default", children, ...props }) {
  const variantStyles = badgeVariants[variant] || badgeVariants.default;
  
  return (
    <div 
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles} ${className || ''}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge };

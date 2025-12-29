import React from 'react';

const Input = React.forwardRef(({ className, type, error, label, id, ...props }, ref) => {
  const inputId = id || React.useId();

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
        >
          {label}
        </label>
      )}
      <input
        type={type}
        className={`
          flex h-10 w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:cursor-not-allowed disabled:opacity-50
          transition duration-200
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className || ''}
        `}
        ref={ref}
        id={inputId}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input };

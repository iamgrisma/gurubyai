import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-saffron-500 text-stone-900 hover:bg-saffron-400 focus-visible:ring-saffron-500 hover:shadow-lg hover:shadow-saffron-500/20 border border-saffron-400",
    secondary: "bg-royal-900 text-white hover:bg-royal-800 focus-visible:ring-royal-500 shadow-md hover:shadow-royal-900/20",
    outline: "border-2 border-stone-200 hover:bg-stone-50 text-stone-700 hover:text-stone-900 hover:border-stone-300",
    ghost: "hover:bg-stone-100 hover:text-stone-900 text-stone-600",
    glass: "bg-white/50 backdrop-blur-md border border-white/60 shadow-sm hover:bg-white/80 text-stone-800"
  };

  const sizes = {
    sm: "h-9 px-4 text-xs tracking-wide",
    md: "h-11 px-6 text-sm tracking-wide",
    lg: "h-14 px-8 text-base tracking-wide",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  icon,
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center font-sans font-bold tracking-[0.3em] transition-all duration-500 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed uppercase text-[10px]";
  
  const sizes = {
    sm: "px-6 py-3",
    md: "px-8 py-4",
    lg: "px-10 py-5 text-[12px]"
  };

  const variants = {
    primary: "bg-emas-sadur text-obsidian hover:bg-white hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] focus:ring-1 focus:ring-emas-sadur shadow-xl",
    secondary: "bg-transparent text-emas-sadur border border-emas-sadur/30 hover:border-emas-sadur hover:bg-emas-sadur/5 focus:ring-1 focus:ring-emas-sadur",
    danger: "bg-red-900/20 text-red-400 border border-red-900/40 hover:bg-red-900/40 focus:ring-1 focus:ring-red-500",
    ghost: "bg-transparent text-emas-sadur/40 hover:text-emas-sadur"
  };

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
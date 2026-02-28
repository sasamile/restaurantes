"use client";

import * as React from "react";

type ButtonVariant = "default" | "outline" | "ghost";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 px-4 py-2";

export const buttonVariants = (props?: { variant?: ButtonVariant }) => {
  const variant = props?.variant ?? "default";
  const variants: Record<ButtonVariant, string> = {
    default:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 ring-offset-red-50",
    outline:
      "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 ring-offset-white",
    ghost:
      "bg-transparent text-zinc-900 hover:bg-zinc-100 ring-offset-white",
  };
  return `${baseClasses} ${variants[variant]}`;
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant }) + (className ? ` ${className}` : "")}
      {...props}
    />
  );
}


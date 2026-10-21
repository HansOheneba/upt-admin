import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-navy text-white hover:bg-navy-deep",
  secondary: "border border-line bg-card text-navy hover:bg-[#F5F7FA]",
};

export function buttonClass(variant: keyof typeof variants = "primary") {
  return `inline-flex h-11 cursor-pointer items-center justify-center rounded-[8px] px-4 text-sm font-medium ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant)} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

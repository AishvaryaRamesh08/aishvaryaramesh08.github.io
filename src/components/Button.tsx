import type { ComponentPropsWithRef } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Native `<button>`; `type` defaults to "button" so it never submits a form by accident. */
export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}

export interface LinkButtonProps extends ComponentPropsWithRef<"a"> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Native `<a href>` styled as a button, for navigation and downloads. */
export function LinkButton({ variant, size, className, href, children, ...rest }: LinkButtonProps) {
  return (
    <a href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </a>
  );
}

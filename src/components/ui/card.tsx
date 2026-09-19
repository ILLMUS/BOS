import * as React from "react";

import { cn } from "@/lib/utils";

/* =========================================================
   RST BUSINESS OS — CARD SYSTEM
   ========================================================= */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border/70 bg-card/60 text-card-foreground shadow-none",
      "transition-colors duration-200",
      "hover:border-primary/15",
      className,
    )}
    {...props}
  />
));

Card.displayName = "Card";

/* =========================================================
   CARD HEADER
   ========================================================= */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 px-4 py-3",
      className,
    )}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

/* =========================================================
   CARD TITLE
   ========================================================= */

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold leading-none tracking-tight",
      "text-foreground",
      className,
    )}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

/* =========================================================
   CARD DESCRIPTION
   ========================================================= */

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-[10px] leading-relaxed text-muted-foreground",
      className,
    )}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

/* =========================================================
   CARD CONTENT
   ========================================================= */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-4 pb-4",
      className,
    )}
    {...props}
  />
));

CardContent.displayName = "CardContent";

/* =========================================================
   CARD FOOTER
   ========================================================= */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-4 pb-4",
      className,
    )}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
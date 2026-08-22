import React from "react";

export function DesktopOnly({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`hidden md:block min-w-0 ${className}`}>{children}</div>;
}

export function MobileOnly({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`block md:hidden min-w-0 ${className}`}>{children}</div>;
}

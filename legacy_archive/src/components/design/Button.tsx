"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button as PrimitiveButton } from "@/components/ui/primitives";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <PrimitiveButton {...props} />;
}


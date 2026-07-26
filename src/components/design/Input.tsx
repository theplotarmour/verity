"use client";

import type { InputHTMLAttributes } from "react";
import { Input as PrimitiveInput } from "@/components/ui/primitives";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <PrimitiveInput {...props} />;
}


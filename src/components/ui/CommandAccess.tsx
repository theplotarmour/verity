"use client";

import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { Button } from "./primitives";

const Commands = createContext<ReadonlySet<string>>(new Set());

/** Presentation only; every action still authorizes again on the server. */
export function CommandAccessProvider({ commandKeys, children }: { commandKeys: string[]; children: ReactNode }) {
  const keys = useMemo(() => new Set(commandKeys), [commandKeys]);
  return <Commands.Provider value={keys}>{children}</Commands.Provider>;
}

export function useCommandAccess() {
  const keys = useContext(Commands);
  return (command: string) => keys.has(command);
}

export function CommandAccess({ commands, children }: { commands: string | string[]; children: ReactNode }) {
  const can = useCommandAccess();
  return (Array.isArray(commands) ? commands : [commands]).some(can) ? children : null;
}

export function CommandButton({ commands, ...props }: ComponentProps<typeof Button> & { commands: string | string[] }) {
  return <CommandAccess commands={commands}><Button {...props} /></CommandAccess>;
}

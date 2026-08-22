"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <Button 
      variant="ghost" 
      className="w-full mt-6 border-danger text-danger hover:bg-danger/10 justify-start"
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {isLoading ? "Logging out..." : "Log out"}
    </Button>
  );
}

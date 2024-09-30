import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/themeToggle";

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="flex items-center justify-between py-4 px-8">
        <Link href="/" className="text-xl font-bold">
          Autosteer
        </Link>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button className="font-semibold">Share results</Button>
        </div>
      </div>
    </nav>
  );
}

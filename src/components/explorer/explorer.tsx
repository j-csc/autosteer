"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Search from "./search";
import Inspect from "./inspect";
import Autosteer from "./autosteer";

export default function Explorer() {
  return (
    <div className="h-full overflow-auto">
      <ScrollArea className="h-full">
        <div className="p-4">
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="inspect">Inspect</TabsTrigger>
              <TabsTrigger value="autosteer">Autosteer</TabsTrigger>
            </TabsList>
            <TabsContent value="search">
              <Search />
            </TabsContent>
            <TabsContent value="inspect">
              <Inspect />
            </TabsContent>
            <TabsContent value="autosteer">
              <Autosteer />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

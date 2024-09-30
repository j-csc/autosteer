import Chat from "./chat/chat";
import Explorer from "./explorer/explorer";

export default function Playground() {
  return (
    <div className="flex w-full h-full border rounded-lg overflow-hidden">
      <div className="w-1/2 border-r bg-background/80 backdrop-blur-lg">
        <Chat />
      </div>
      <div className="w-1/2 bg-background/80 backdrop-blur-lg">
        <Explorer />
      </div>
    </div>
  );
}

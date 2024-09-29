import Chat from "./chat/chat";
import Explorer from "./explorer/explorer";

export default function Playground() {
  return (
    <div className="flex w-full h-full">
      <Chat />
      <Explorer />
    </div>
  );
}

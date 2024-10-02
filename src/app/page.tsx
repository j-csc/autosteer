import Layout from "./layout";
import Playground from "@/components/playground";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col w-full h-screen">
        <Navbar />
        <div className="flex-grow p-8 overflow-hidden">
          <Playground />
        </div>
      </div>
    </Layout>
  );
}

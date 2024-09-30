import Layout from "./layout";
import Playground from "@/components/playground";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col w-full h-screen">
        <Navbar />
        <div className="p-8 w-full h-screen">
          <Playground />
        </div>
      </div>
    </Layout>
  );
}

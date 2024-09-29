import Layout from "./layout";
import Playground from "@/components/playground";

export default function Home() {
  return (
    <Layout>
      <div className="w-full h-screen">
        <Playground />
      </div>
    </Layout>
  );
}

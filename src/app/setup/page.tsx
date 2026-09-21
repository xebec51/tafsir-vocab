import { Settings } from "lucide-react";
import SetupStatus from "@/components/SetupStatus";
export default function SetupPage() {
  return <main className="shell narrow-shell"><section className="page-heading"><span className="page-heading-icon"><Settings size={23} /></span><div><div className="kicker">Installation diagnostics</div><h1>Setup status</h1><p>This page only checks whether required services and Juz 14 course data are available.</p></div></section><SetupStatus /><div className="setup-commands"><h2>Initial setup</h2><pre><code>{`npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run data:import:juz14
npm run data:stats
npm run dev`}</code></pre></div></main>;
}

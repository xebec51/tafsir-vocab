import { Target } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import WeakWords from "@/components/WeakWords";

export default function WeakWordsPage() {
  return <><AppHeader /><main className="shell narrow-shell"><section className="page-heading"><span className="page-heading-icon warm"><Target size={23} /></span><div><div className="kicker">Priority study</div><h1>Weak words</h1><p>Repeated mistakes are ranked so your study time goes where it matters most.</p></div></section><WeakWords /></main></>;
}

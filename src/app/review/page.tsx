import { RotateCcw } from "lucide-react";
import ReviewSession from "@/components/ReviewSession";

export default function ReviewPage() {
  return <main className="shell narrow-shell"><section className="page-heading"><span className="page-heading-icon"><RotateCcw size={23} /></span><div><div className="kicker">Spaced repetition</div><h1>Review due words</h1><p>Strengthen recall with focused Arabic-to-English retrieval.</p></div></section><ReviewSession /></main>;
}

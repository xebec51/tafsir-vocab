import { BookOpenText } from "lucide-react";
import TafsirPractice from "@/components/TafsirPractice";

export default function TafsirPracticePage() {
  return <main className="shell practice-shell"><section className="page-heading"><span className="page-heading-icon dark"><BookOpenText size={23} /></span><div><div className="kicker">Competition preparation</div><h1>English Tafsir Practice</h1><p>Explain vocabulary accurately and connect it to the ayah context in clear English.</p></div></section><TafsirPractice /></main>;
}

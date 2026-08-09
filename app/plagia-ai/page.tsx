import { redirect } from "next/navigation"

// PlagiaAI lives on the home page. This route exists only so old links
// keep working — it redirects server-side to the canonical URL.
export default function PlagiaAiPage() {
  redirect("/")
}

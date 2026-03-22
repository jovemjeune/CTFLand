import { redirect } from "next/navigation"

/** @deprecated Use `/competitors` */
export default function CompeteRedirectPage() {
  redirect("/competitors")
}

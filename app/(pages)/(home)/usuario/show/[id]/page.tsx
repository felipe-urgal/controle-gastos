import { permanentRedirect } from "next/navigation";

export default function LegacyUserShowPage() {
  permanentRedirect("/usuario");
}

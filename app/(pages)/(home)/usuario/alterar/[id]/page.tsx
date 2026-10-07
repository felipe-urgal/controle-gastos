import { permanentRedirect } from "next/navigation";

export default function LegacyUserEditPage() {
  permanentRedirect("/usuario/editar");
}

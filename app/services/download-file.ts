/**
 * Baixa um arquivo gerado pelo servidor (`content-disposition: attachment`). Usa o nome que o servidor sugeriu;
 * o corpo de erro da API (JSON) vira a mensagem, e qualquer outra falha usa `errorMessage`.
 */
export async function downloadServerFile(url: string, fallbackFilename: string, errorMessage: string) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    let message = errorMessage;
    try {
      const body = (await response.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message || body?.message || message;
    } catch {
      // Mantém a mensagem padrão quando o corpo não é JSON.
    }
    throw new Error(message);
  }

  const filename =
    /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackFilename;
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

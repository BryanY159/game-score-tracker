export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * FR-15 AC-1: hand the file to the iOS share sheet (Save to Files, AirDrop...).
 * Falls back to a download where file sharing isn't supported (R-11).
 */
export async function saveFile(text: string, name: string, type = 'application/json'): Promise<SaveResult> {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      throw e;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

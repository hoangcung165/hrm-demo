// Hands a downloaded file to the browser as a download, under the given name.

/** How long the object URL stays valid after the click; some browsers read it after the click returns. */
const REVOKE_AFTER_MS = 10_000;

export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

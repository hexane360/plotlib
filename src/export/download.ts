/** Trigger a browser download of a `Blob` with the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // defer revocation -- some browsers process the download asynchronously after `click()` returns
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

import api from '../../../api/axiosInstance';

/**
 * Triggers a browser file download for an export artifact.
 *
 * Uses the Axios instance (which carries the Authorization header) to fetch
 * the file as a binary blob, then creates an object URL and clicks a hidden
 * anchor to push the Save dialog to the user.
 *
 * @param downloadUrl  Path relative to the Axios baseURL (which already
 *                     includes {@code /api/v1}), e.g. {@code /board/download/abc123}.
 *                     Any accidental {@code /api/v1} prefix is stripped automatically.
 * @param filename     Suggested filename for the browser Save dialog.
 *                     Derived from the {@code Content-Disposition} header if omitted.
 */
export async function triggerFileDownload(
  downloadUrl: string,
  filename?: string,
): Promise<void> {
  // Guard: strip a leading /api/v1 prefix if the backend ever sends a fully
  // qualified path — prevents the double-prefix 404.
  const normalisedUrl = downloadUrl.replace(/^\/api\/v1/, '');

  const response = await api.get(normalisedUrl, { responseType: 'blob' });

  // Derive filename from Content-Disposition header if the caller didn't
  // supply one — the backend always sets it.
  const resolvedName =
    filename ??
    extractFilenameFromHeader(response.headers['content-disposition']) ??
    downloadUrl.split('/').pop() ??
    'export';

  const blobUrl = URL.createObjectURL(response.data as Blob);
  const anchor  = document.createElement('a');
  anchor.href     = blobUrl;
  anchor.download = resolvedName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke the object URL after a short delay so the browser can finish the
  // download before we release the memory.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFilenameFromHeader(header: string | undefined): string | null {
  if (!header) return null;
  // Handles both `filename="foo.pdf"` and `filename*=UTF-8''foo.pdf`
  const match = header.match(/filename\*?=(?:UTF-8''|"?)([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : null;
}
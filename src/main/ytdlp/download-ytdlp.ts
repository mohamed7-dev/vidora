import YTDlpWrapImport from 'yt-dlp-wrap-plus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

/**
 * @description
 * Downloads yt-dlp from github
 * @param path - path to download yt-dlp to
 * @param progressCallback - optional callback to receive progress updates
 */
export async function downloadYtdlp(
  path: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  if (typeof YTDlpWrap.downloadFromGithub !== 'function') {
    throw new Error('downloadFromGithub is not available on YTDlpWrap export')
  }
  await YTDlpWrap?.downloadFromGithub(path, undefined, undefined, progressCallback)
}

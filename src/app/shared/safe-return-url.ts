/** Only allows in-app paths, so `returnUrl` cannot redirect to another site. */
export function safeReturnUrl(url: string | undefined): string {
  return url?.startsWith('/') && !url.startsWith('//') ? url : '/';
}

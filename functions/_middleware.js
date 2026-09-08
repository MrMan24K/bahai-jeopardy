export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname.endsWith('.pages.dev')) {
    url.protocol = 'https:';
    url.hostname = 'bahaijeopardy.com';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}

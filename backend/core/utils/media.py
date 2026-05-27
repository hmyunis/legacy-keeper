from urllib.parse import urlsplit


_LOCAL_HOSTS = {'localhost', '127.0.0.1', '::1'}


def normalize_media_url(url):
    if not url:
        return url

    parsed = urlsplit(str(url))
    if parsed.scheme in {'http', 'https'} and parsed.hostname in _LOCAL_HOSTS:
        return f"{parsed.path}{f'?{parsed.query}' if parsed.query else ''}{f'#{parsed.fragment}' if parsed.fragment else ''}"

    return url

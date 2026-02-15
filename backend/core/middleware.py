import threading

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class ThreadLocalUserMiddleware:
    """
    Middleware that captures the current user and request
    in thread-local storage for access in Signals.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        try:
            return self.get_response(request)
        finally:
            if hasattr(_thread_locals, 'user'):
                delattr(_thread_locals, 'user')

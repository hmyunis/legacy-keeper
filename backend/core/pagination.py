from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_page_size(self, request):
        page_size = super().get_page_size(request)
        if page_size is not None:
            return page_size

        alt_page_size = request.query_params.get('pageSize')
        if not alt_page_size:
            return None

        try:
            parsed = int(alt_page_size)
        except (TypeError, ValueError):
            return None

        if parsed <= 0:
            return None

        return min(parsed, self.max_page_size)

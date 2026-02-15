import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface PaginationProps {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage?: boolean;
  onNextPage: () => void;
  onPreviousPage?: () => void;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  showLoadMore?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
  onNextPage,
  onPreviousPage,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  showLoadMore = false,
}) => {
  if (showLoadMore) {
    return (
      <div className="flex justify-center py-8">
        {hasNextPage ? (
          <button
            onClick={onNextPage}
            disabled={isFetchingNextPage}
            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {totalCount !== undefined ? `${totalCount} total items` : 'No more items'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        {totalCount !== undefined && pageSize !== undefined && (
          <span>
            Showing {((currentPage || 1) - 1) * pageSize + 1} - {Math.min((currentPage || 1) * pageSize, totalCount)} of {totalCount}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {onPreviousPage && (
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isFetchingPreviousPage}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isFetchingPreviousPage ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        )}
        
        {currentPage !== undefined && totalPages !== undefined && (
          <div className="flex items-center gap-1 px-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{currentPage}</span>
            <span className="text-sm text-slate-400">/</span>
            <span className="text-sm text-slate-500">{totalPages}</span>
          </div>
        )}
        
        <button
          onClick={onNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isFetchingNextPage ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

interface InfiniteScrollProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  children,
  loader,
  endMessage,
}) => {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <>
      {children}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (loader || (
          <div className="flex justify-center py-4">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ))}
        {!hasNextPage && !isFetchingNextPage && (endMessage || (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
            No more items
          </p>
        ))}
      </div>
    </>
  );
};

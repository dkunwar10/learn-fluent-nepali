import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTaskListService, TaskSetFilter, TaskSet } from '@/api/taskListService';
import TaskCard from './TaskCard';
import TaskFilter from './TaskFilter';
import TaskPagination from './TaskPagination';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Component for displaying a list of task sets with filtering and pagination
 */
const TaskList: React.FC = () => {
  // Task service
  const { fetchTaskSets: apiFetchTaskSets } = useTaskListService();

  // Use useCallback to memoize the fetchTaskSets function
  const fetchTaskSets = useCallback(
    (filter: TaskSetFilter) => apiFetchTaskSets(filter),
    [apiFetchTaskSets]
  );

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskSets, setTaskSets] = useState<TaskSet[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [filter, setFilter] = useState<TaskSetFilter>({
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: -1,
    // Initialize with empty values for other filters
    status: undefined,
    search: undefined,
    start_date: undefined,
    end_date: undefined
  });

  // Track if initial data has been loaded
  const dataLoadedRef = useRef(false);

  // Load task sets
  useEffect(() => {
    // Skip if data has already been loaded and filter hasn't changed
    if (dataLoadedRef.current && !loading) {
      return;
    }

    const loadTaskSets = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching task sets with filter:', filter);
        const response = await fetchTaskSets(filter);

        // Check if response and response.items exist
        if (response && Array.isArray(response.items)) {
          setTaskSets(response.items);
          setTotalItems(response.total || 0);
          setTotalPages(response.pages || 0);
          dataLoadedRef.current = true;
        } else {
          console.error('Invalid API response format:', response);
          setTaskSets([]);
          setTotalItems(0);
          setTotalPages(0);
          setError('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching task sets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load task sets');
        setTaskSets([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    loadTaskSets();
  }, [filter, fetchTaskSets, loading]);

  // Handle filter change
  const handleFilterChange = (newFilter: TaskSetFilter) => {
    dataLoadedRef.current = false; // Reset to force reload
    setFilter(newFilter);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dataLoadedRef.current = false; // Reset to force reload
    setFilter({ ...filter, page });
  };

  // Handle page size change
  const handlePageSizeChange = (limit: number) => {
    dataLoadedRef.current = false; // Reset to force reload
    setFilter({ ...filter, limit, page: 1 });
  };

  // Render loading skeletons
  const renderSkeletons = () => {
    return Array(filter.limit).fill(0).map((_, index) => (
      <div key={index} className="p-4 border rounded-lg">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-2 w-full mb-4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Fixed Header - Filter section */}
      <div className="sticky top-0 z-10 bg-gray-50 pt-4 px-4">
        <TaskFilter filter={filter} onFilterChange={handleFilterChange} />

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto px-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            renderSkeletons()
          ) : taskSets && taskSets.length > 0 ? (
            taskSets.map((task, index) => (
              <TaskCard key={task._id || index} task={task} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No task sets found</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer - Pagination */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-4 py-3">
        {!loading && taskSets && taskSets.length > 0 ? (
          <TaskPagination
            currentPage={filter.page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={filter.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : (
          <div className="h-10"></div> // Empty space to maintain footer height when no pagination
        )}
      </div>
    </div>
  );
};

export default TaskList;

import { useAuth } from '@/context/AuthContext';

export interface TaskSetFilter {
  page: number;
  limit: number;
  sort_by: string;
  sort_order: number;
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface TaskSet {
  _id: string;
  user_id: string;
  input_type: string;
  input_content: string;
  tasks: string[];
  status: string;
  created_at: string;
  completed_at?: string | null;
  max_score?: number;
  scored?: number;
  remark?: string | null;
  input_metadata?: {
    object_name: string;
    folder: string;
    bucket: string;
    content_type: string;
    size_bytes: number;
  };
}

export interface TaskSetResponse {
  items: TaskSet[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Interface for the actual API response format
export interface ApiTaskSetResponse {
  data: TaskSet[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages?: number;
    has_more?: boolean;
    count?: number;
  };
}

/**
 * Service for fetching task sets with filtering and pagination
 */
export const useTaskListService = () => {
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1';

  /**
   * Fetch task sets with filtering and pagination
   */
  const fetchTaskSets = async (filter: TaskSetFilter): Promise<TaskSetResponse> => {
    if (!user?.token) {
      throw new Error('User not authenticated');
    }

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Ensure sort_order is passed as a number (1 or -1)
          if (key === 'sort_order') {
            queryParams.append(key, value.toString());
            console.log(`Setting sort_order to ${value} (${typeof value})`);
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const url = `${apiUrl}/tasks/task-sets/filtered?${queryParams.toString()}`;
      console.log('Fetching task sets from:', url, 'with filter:', filter);

      // Make API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.detail || `Failed to fetch task sets: ${response.status}`);
      }

      const apiResponse = await response.json() as ApiTaskSetResponse;
      console.log('API response data:', apiResponse);

      // Ensure the response has the expected structure
      if (!apiResponse || !Array.isArray(apiResponse.data)) {
        console.error('Invalid API response format:', apiResponse);
        return {
          items: [],
          total: 0,
          page: filter.page,
          limit: filter.limit,
          pages: 0
        };
      }

      // Transform the API response to match the expected TaskSetResponse format
      const transformedResponse: TaskSetResponse = {
        items: apiResponse.data,
        total: apiResponse.meta.total,
        page: apiResponse.meta.page || filter.page,
        limit: apiResponse.meta.limit || filter.limit,
        pages: apiResponse.meta.total_pages || Math.ceil(apiResponse.meta.total / filter.limit)
      };

      return transformedResponse;
    } catch (error) {
      console.error('Error in fetchTaskSets:', error);
      throw error;
    }
  };

  return {
    fetchTaskSets
  };
};

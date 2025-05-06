import { UserData } from "../types/User";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/v1";

/**
 * Interface for a task item
 */
export interface Task {
  id?: string;
  _id?: string; // MongoDB ID format from backend
  type: string;
  question?: string;
  options?: string[];
  answer?: string;
  word?: string;
  audio_hint_url?: string;
  image_url?: string;
  status?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for a task set
 */
export interface TaskSet {
  id: string;
  tasks: Task[];
  created_at: string;
  user_id?: string;
  input_type?: string;
  input_content?: string;
  status?: string;
  total_score?: number;
  [key: string]: any; // Allow for additional properties
}

/**
 * Interface for task answer submission
 */
export interface TaskAnswer {
  task_id: string;
  user_answer: string | number | boolean;
  is_correct?: boolean;
  status?: string;
  feedback?: string;
}

/**
 * Interface for task submission result
 */
export interface TaskSubmissionResult {
  success: boolean;
  results: {
    task_id: string;
    is_correct: boolean;
    score: number;
    correct_answer?: string;
    feedback?: string;
  }[];
  total_score: number;
  user_score?: {
    total_score: number;
    total_attempts: number;
    correct_answers: number;
    accuracy: number;
  };
}

/**
 * Interface for task set request options
 */
export interface TaskSetRequestOptions {
  include_tasks?: boolean;
  // fields has a default value in the backend, so we don't need to send it
  // fields?: string[];
}

/**
 * Interface for task request options
 */
export interface TaskRequestOptions {
  fields?: string[];
}

/**
 * Interface for pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  skip: number;
  total: number;
  has_more: boolean;
  count: number;
}

/**
 * Interface for paginated task sets response
 */
export interface PaginatedTaskSets {
  data: TaskSet[];
  meta: PaginationMeta;
}

/**
 * Fetch a task set by ID with options for field filtering
 * @param taskSetId The ID of the task set to fetch
 * @param user The authenticated user data
 * @param options Optional request options for filtering fields
 * @returns The task set data
 */
export const fetchTaskSet = async (
  taskSetId: string,
  user: UserData,
  options?: TaskSetRequestOptions
): Promise<TaskSet> => {
  try {
    // Use the new POST endpoint with request body for more control
    const response = await fetch(`${API_URL}/tasks/task-set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${user.tokenType} ${user.token}`
      },
      body: JSON.stringify({
        set_id: taskSetId,
        include_tasks: options?.include_tasks ?? false
        // fields has a default value in the backend
        // task_fields was removed from the API
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task set: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching task set:", error);
    throw error;
  }
};

/**
 * Fetch a single task by ID with options for field filtering
 * @param taskId The ID of the task to fetch
 * @param user The authenticated user data
 * @param options Optional request options for filtering fields
 * @returns The task data
 */
export const fetchTask = async (
  taskId: string,
  user: UserData,
  options?: TaskRequestOptions
): Promise<Task> => {
  try {
    // Use the new POST endpoint with request body for more control
    const response = await fetch(`${API_URL}/tasks/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${user.tokenType} ${user.token}`
      },
      body: JSON.stringify({
        task_id: taskId,
        fields: options?.fields
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching task:", error);
    throw error;
  }
};

/**
 * Submit answers for a task set
 * @param taskSetId The ID of the task set
 * @param answers Array of task answers
 * @param user The authenticated user data
 * @returns The submission result
 */
export const submitTaskAnswers = async (
  taskSetId: string,
  answers: TaskAnswer[],
  user: UserData
): Promise<TaskSubmissionResult> => {
  try {
    const response = await fetch(`${API_URL}/tasks/task-set/submit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${user.tokenType} ${user.token}`
      },
      body: JSON.stringify({
        set_id: taskSetId,
        answers: answers
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit task answers: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error submitting task answers:", error);
    throw error;
  }
};

/**
 * Submit an answer for a single task
 * @param taskId The ID of the task
 * @param answer The user's answer
 * @param user The authenticated user data
 * @param taskType Optional task type
 * @returns The submission result for the single task
 */
export const submitTaskAnswer = async (
  taskId: string,
  answer: string | number | boolean,
  user: UserData,
  taskType?: string
): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/tasks/task/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${user.tokenType} ${user.token}`
      },
      body: JSON.stringify({
        task_id: taskId,
        answer: answer,
        task_type: taskType
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit task answer: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error submitting task answer:", error);
    throw error;
  }
};

/**
 * Fetch user's task sets with pagination
 * @param user The authenticated user data
 * @param limit Maximum number of records to return (default: 10)
 * @param skip Number of records to skip (default: 0)
 * @param fields Optional fields to retrieve
 * @returns Paginated list of task sets
 */
export const fetchUserTaskSets = async (
  user: UserData,
  limit: number = 10,
  skip: number = 0,
  fields?: string[]
): Promise<PaginatedTaskSets> => {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: skip.toString()
    });

    // Add fields if provided
    if (fields && fields.length > 0) {
      fields.forEach(field => params.append('fields', field));
    }

    const response = await fetch(`${API_URL}/tasks/user/task-sets?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${user.tokenType} ${user.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user task sets: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user task sets:", error);
    throw error;
  }
};

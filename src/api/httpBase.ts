import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';
import { UserData } from '@/types/User';

// Type definitions
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiCallbacks<T = any> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  onFinally?: () => void;
}

// Create the base HTTP client
const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor - Add auth token
httpClient.interceptors.request.use(
  (config) => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user: UserData = JSON.parse(userData);
        if (user.token) {
          config.headers['Authorization'] = `${user.tokenType || 'Bearer'} ${user.token}`;
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('user');
        // Keep tenant slug
        const tenantSlug = localStorage.getItem('tenant_slug');
        if (tenantSlug) {
          window.location.href = `/${tenantSlug}/login`;
        } else {
          window.location.href = '/';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic request function with callbacks
export const apiRequest = async <T = any>(
  config: AxiosRequestConfig,
  callbacks?: ApiCallbacks<T>
): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await httpClient(config);
    
    const apiResponse: ApiResponse<T> = {
      data: response.data,
      status: response.status
    };
    
    if (callbacks?.onSuccess) {
      callbacks.onSuccess(apiResponse.data);
    }
    
    return apiResponse;
  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred';
    let errorStatus = 500;
    
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.detail || error.message;
      errorStatus = error.response?.status || 500;
    }
    
    const apiError: ApiError = {
      message: errorMessage,
      status: errorStatus,
      code: error.code
    };
    
    if (callbacks?.onError) {
      callbacks.onError(apiError);
    } else {
      // Default error handling with toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    throw apiError;
  } finally {
    if (callbacks?.onFinally) {
      callbacks.onFinally();
    }
  }
};

// Convenience methods
export const get = <T = any>(
  url: string, 
  params?: any, 
  callbacks?: ApiCallbacks<T>
): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'GET', url, params }, callbacks);
};

export const post = <T = any>(
  url: string, 
  data?: any, 
  callbacks?: ApiCallbacks<T>
): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'POST', url, data }, callbacks);
};

export const put = <T = any>(
  url: string, 
  data?: any, 
  callbacks?: ApiCallbacks<T>
): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'PUT', url, data }, callbacks);
};

export const del = <T = any>(
  url: string, 
  params?: any, 
  callbacks?: ApiCallbacks<T>
): Promise<ApiResponse<T>> => {
  return apiRequest<T>({ method: 'DELETE', url, params }, callbacks);
};

export default {
  client: httpClient,
  get,
  post,
  put,
  delete: del,
  request: apiRequest
};

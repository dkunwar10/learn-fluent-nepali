
import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading, setError, clearError } from '@/redux/slices/uiSlice';
import { toast } from '@/hooks/use-toast';
import http, { ApiCallbacks } from '@/api/httpBase';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any>(defaultOptions?: UseApiOptions) {
  const dispatch = useDispatch();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorLocal] = useState<string | null>(null);

  const callApi = useCallback(
    async <R = T>(
      method: 'get' | 'post' | 'put' | 'delete',
      url: string,
      payload?: any,
      options?: UseApiOptions
    ) => {
      const mergedOptions = { ...defaultOptions, ...options };
      
      setIsLoading(true);
      dispatch(setLoading(true));
      dispatch(clearError());
      setErrorLocal(null);

      try {
        let response;
        
        const callbacks: ApiCallbacks<R> = {
          onSuccess: (data) => {
            setData(data as any);
            
            if (mergedOptions.showSuccessToast) {
              toast({
                title: 'Success',
                description: mergedOptions.successMessage || 'Operation completed successfully',
              });
            }
          },
          onError: (error) => {
            setErrorLocal(error.message);
            dispatch(setError(error.message));
            
            if (mergedOptions.showErrorToast) {
              toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
              });
            }
          },
          onFinally: () => {
            setIsLoading(false);
            dispatch(setLoading(false));
          }
        };
        
        switch (method) {
          case 'get':
            response = await http.get<R>(url, payload, callbacks);
            break;
          case 'post':
            response = await http.post<R>(url, payload, callbacks);
            break;
          case 'put':
            response = await http.put<R>(url, payload, callbacks);
            break;
          case 'delete':
            response = await http.delete<R>(url, payload, callbacks);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }
        
        return response.data;
      } catch (error: any) {
        // Error is already handled in callbacks
        return null;
      }
    },
    [defaultOptions, dispatch]
  );

  const get = useCallback(
    <R = T>(url: string, params?: any, options?: UseApiOptions) => 
      callApi<R>('get', url, params, options),
    [callApi]
  );

  const post = useCallback(
    <R = T>(url: string, data?: any, options?: UseApiOptions) => 
      callApi<R>('post', url, data, options),
    [callApi]
  );

  const put = useCallback(
    <R = T>(url: string, data?: any, options?: UseApiOptions) => 
      callApi<R>('put', url, data, options),
    [callApi]
  );

  const del = useCallback(
    <R = T>(url: string, params?: any, options?: UseApiOptions) => 
      callApi<R>('delete', url, params, options),
    [callApi]
  );

  return {
    data,
    isLoading,
    error,
    get,
    post,
    put,
    delete: del,
    clearError: () => {
      setErrorLocal(null);
      dispatch(clearError());
    },
    setData,
  };
}

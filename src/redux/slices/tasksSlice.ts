
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { TaskSet } from '@/api/taskListService';
import http from '@/api/httpBase';

interface TasksState {
  taskSets: TaskSet[];
  currentTask: TaskSet | null;
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  totalPages: number;
}

const initialState: TasksState = {
  taskSets: [],
  currentTask: null,
  isLoading: false,
  error: null,
  totalItems: 0,
  totalPages: 0,
};

// Async thunks for task operations
export const fetchTaskSets = createAsyncThunk(
  'tasks/fetchTaskSets',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await http.get('/tasks/task-sets/filtered', params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch tasks');
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await http.post('/tasks/task-set', { set_id: taskId });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch task');
    }
  }
);

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaskSets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskSets.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.taskSets = action.payload.items || [];
        state.totalItems = action.payload.total || 0;
        state.totalPages = action.payload.pages || 0;
      })
      .addCase(fetchTaskSets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTaskById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action: PayloadAction<TaskSet>) => {
        state.isLoading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTask } = tasksSlice.actions;
export default tasksSlice.reducer;

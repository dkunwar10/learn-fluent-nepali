
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import tasksReducer from './slices/tasksSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    tasks: tasksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

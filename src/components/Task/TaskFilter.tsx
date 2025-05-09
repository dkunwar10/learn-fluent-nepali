import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { TaskSetFilter } from '@/api/taskListService';

interface TaskFilterProps {
  filter: TaskSetFilter;
  onFilterChange: (filter: TaskSetFilter) => void;
}

/**
 * Component for filtering task sets
 */
const TaskFilter: React.FC<TaskFilterProps> = ({ filter, onFilterChange }) => {
  // Local state for form inputs
  const [search, setSearch] = useState(filter.search || '');
  const [status, setStatus] = useState(filter.status || 'all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filter.start_date ? new Date(filter.start_date) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filter.end_date ? new Date(filter.end_date) : undefined
  );
  const [sortBy, setSortBy] = useState(filter.sort_by || 'created_at');
  // Ensure sort order is stored as a string but represents a number (1 or -1)
  const [sortOrder, setSortOrder] = useState(
    filter.sort_order !== undefined ? filter.sort_order.toString() : '-1'
  );

  // Apply filters
  const applyFilters = () => {
    // Parse sort order to number (1 for ascending, -1 for descending)
    const numericSortOrder = parseInt(sortOrder);

    console.log('Applying filters with sort:', sortBy, 'order:', numericSortOrder);

    onFilterChange({
      ...filter,
      search,
      status: status === 'all' ? undefined : status,
      start_date: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      end_date: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      sort_by: sortBy,
      sort_order: numericSortOrder, // Ensure it's a number
      page: 1, // Reset to first page when filters change
    });
  };

  // Reset filters
  const resetFilters = () => {
    // Reset local state
    setSearch('');
    setStatus('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy('created_at');
    setSortOrder('-1');

    // Apply reset to filter state with numeric sort order
    onFilterChange({
      page: 1,
      limit: filter.limit,
      sort_by: 'created_at',
      sort_order: -1, // Ensure it's a number (-1 for descending)
      // Clear all other filters
      search: undefined,
      status: undefined,
      start_date: undefined,
      end_date: undefined
    });
  };

  // No need for a separate handleSortChange function
  // We'll update the state directly in the Select onValueChange

  return (
    <div className="bg-white p-3 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        {/* Search input */}
        <div className="relative">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        {/* Status filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range filter */}
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal h-9">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start text-left font-normal h-9">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PP') : 'To Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort options */}
        <Select
          value={`${sortBy}:${sortOrder}`}
          onValueChange={(value) => {
            const [newSortBy, newSortOrder] = value.split(':');
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:-1">Date (Newest First) ↓</SelectItem>
            <SelectItem value="created_at:1">Date (Oldest First) ↑</SelectItem>
            <SelectItem value="input_content:1">Content (A-Z) ↑</SelectItem>
            <SelectItem value="input_content:-1">Content (Z-A) ↓</SelectItem>
            <SelectItem value="status:1">Status (A-Z) ↑</SelectItem>
            <SelectItem value="status:-1">Status (Z-A) ↓</SelectItem>
            <SelectItem value="max_score:-1">Score (High-Low) ↓</SelectItem>
            <SelectItem value="max_score:1">Score (Low-High) ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={resetFilters} size="sm" className="h-8">
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button onClick={applyFilters} size="sm" className="h-8">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default TaskFilter;

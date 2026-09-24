import { SearchX, UserPlus } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';

type EmptyStateProps = {
  hasFilters: boolean;
  onResetFilters: () => void;
};

export const EmptyState = ({ hasFilters, onResetFilters }: EmptyStateProps): React.JSX.Element => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
    {hasFilters ? <SearchX className="h-8 w-8 text-muted-foreground" /> : <UserPlus className="h-8 w-8 text-muted-foreground" />}
    <div>
      <p className="text-sm font-medium">{hasFilters ? 'No matching patients' : 'No patients yet'}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters ? 'Try adjusting or clearing your filters.' : 'New registrations from the voice agent will appear here.'}
      </p>
    </div>
    {hasFilters && (
      <Button variant="outline" size="sm" onClick={onResetFilters}>
        Reset filters
      </Button>
    )}
  </div>
);

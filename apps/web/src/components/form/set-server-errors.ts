import { type ErrorResponse } from '@carnotea/shared';
import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'; // Path used for issue paths below

export function setServerErrors<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
  error: ErrorResponse,
): void {
  if (error.issues?.length) {
    for (const issue of error.issues) {
      const path = issue.path.join('.') as Path<TValues>;
      setError(path, { message: issue.message });
    }
  } else {
    setError('root', { message: error.message });
  }
}

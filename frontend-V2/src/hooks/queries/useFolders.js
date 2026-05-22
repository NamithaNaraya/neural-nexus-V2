import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { folderService } from '../../services/folderService';

const FOLDERS_STALE_TIME = 60 * 1000; // 1 minute

/**
 * Fetches all folders for the current user.
 */
export function useFolders(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['folders'],
    queryFn: () => folderService.list(),
    enabled,
    staleTime: FOLDERS_STALE_TIME,
    select: (data) => data || [],
  });
}

/**
 * Fetches a single folder by ID.
 */
export function useFolder(folderId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => folderService.get(folderId),
    enabled: !!folderId && enabled,
    staleTime: FOLDERS_STALE_TIME,
  });
}

/**
 * Fetches files within a folder.
 */
export function useFolderFiles(folderId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['folders', folderId, 'files'],
    queryFn: () => folderService.getFiles(folderId),
    enabled: !!folderId && enabled,
    staleTime: FOLDERS_STALE_TIME,
    select: (data) => data || [],
  });
}

/**
 * Mutation: Create a new folder.
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }) => folderService.create(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

/**
 * Mutation: Delete a folder.
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId) => folderService.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

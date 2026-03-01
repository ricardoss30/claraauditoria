import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFiles, uploadFile, deleteFile, createFolder, deleteFolder } from "@/services/knowledgeBaseService";

export function useKnowledgeBase(folder: string) {
  const queryClient = useQueryClient();
  const queryKey = ["knowledge-base", folder];

  const filesQuery = useQuery({
    queryKey,
    queryFn: () => listFiles(folder),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });

  const uploadMutation = useMutation({
    mutationFn: ({ file, path }: { file: File; path: string }) => uploadFile(file, path),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteFile(path),
    onSuccess: invalidate,
  });

  const createFolderMutation = useMutation({
    mutationFn: (path: string) => createFolder(path),
    onSuccess: invalidate,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (path: string) => deleteFolder(path),
    onSuccess: invalidate,
  });

  return {
    files: filesQuery.data ?? [],
    isLoading: filesQuery.isLoading,
    uploadMutation,
    deleteMutation,
    createFolderMutation,
    deleteFolderMutation,
  };
}

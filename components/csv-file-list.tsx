"use client";

import { useEffect, useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, listAll, getMetadata, getDownloadURL, deleteObject } from "firebase/storage";
import { format } from "date-fns";
import Papa from "papaparse";
import { useDataContext } from "@/app/contexts/data-context";
import { DataRow } from "@/types/data";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StorageFile {
  name: string;
  uploadedAt: Date;
  downloadURL: string;
  size: number;
  folder: string;
}

interface FolderFiles {
  can: StorageFile[];
  ms60s: StorageFile[];
}

interface CSVFileListProps {
  onUpdate?: () => void;
}

export default function CSVFileList({ onUpdate }: CSVFileListProps) {
  const [files, setFiles] = useState<FolderFiles>({ can: [], ms60s: [] });
  const [loading, setLoading] = useState(true);
  const [deleteFile, setDeleteFile] = useState<StorageFile | null>(null);
  const { setData } = useDataContext();

  const fetchAllFiles = async () => {
    async function fetchFilesFromFolder(folderPath: 'can' | 'ms60s') {
      const storageRef = ref(storage, folderPath);
      const result = await listAll(storageRef);
      
      const filePromises = result.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const downloadURL = await getDownloadURL(item);
        
        return {
          name: item.name,
          uploadedAt: new Date(metadata.timeCreated),
          downloadURL,
          size: metadata.size,
          folder: folderPath
        };
      });

      return Promise.all(filePromises);
    }

    try {
      const [canFiles, ms60sFiles] = await Promise.all([
        fetchFilesFromFolder('can'),
        fetchFilesFromFolder('ms60s')
      ]);

      setFiles({
        can: canFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()),
        ms60s: ms60sFiles.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to fetch file list");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFiles();
  }, []);

  const handleDelete = async (file: StorageFile) => {
    try {
      const fileRef = ref(storage, `${file.folder}/${file.name}`);
      await deleteObject(fileRef);
      toast.success("File deleted successfully");
      fetchAllFiles();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
    setDeleteFile(null);
  };

  const loadFile = async (file: StorageFile) => {
    try {
      const response = await fetch(`/api/csv?folder=${file.folder}&filename=${encodeURIComponent(file.name)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      Papa.parse<DataRow>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: (field) => field !== "BMS_PackFaultStatus",
        transformHeader: (header) => header.trim(),
        transform: (value) => {
          if (value === "") return null;
          return value;
        },
        complete: (result) => {
          const parsedData = result.data.filter((row) => row.Timestamp);
          setData(parsedData);
          toast.success("File loaded successfully");
        },
        error: (error: Error) => {
          toast.error("Failed to parse CSV file", {
            description: error.message,
          });
        },
      });
    } catch (error) {
      console.error("Error loading file:", error);
      toast.error("Failed to load file", {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading files...</div>;
  }

  if (files.can.length === 0 && files.ms60s.length === 0) {
    return <div className="text-center p-4 text-muted-foreground">No files uploaded yet</div>;
  }

  const FileList = ({ files, title }: { files: StorageFile[], title: string }) => (
    <div className="space-y-2">
      <h3 className="text-md font-medium">{title}</h3>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files in this folder</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 group"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => loadFile(file)}
              >
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  Uploaded {format(file.uploadedAt, "PPP 'at' pp")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteFile(file);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete file</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <FileList files={files.can} title="CAN Data Files" />
        <FileList files={files.ms60s} title="MS60S Data Files" />
      </div>

      <AlertDialog open={deleteFile !== null} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteFile?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFile && handleDelete(deleteFile)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 
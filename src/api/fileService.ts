import { UserData } from "../types/User";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/v1";

/**
 * Get a file URL by object name and folder
 * @param objectName The name of the file object
 * @param folder The folder path where the file is stored
 * @param user The authenticated user data
 * @returns The file URL
 */


export interface FileUploadResponse {
  object_name: string;
  folder: string;
  url?: string;
  content_type?: string;
  size_bytes?: number;
}

export const getFileUrl = async (
  objectName: string,
  folder: string,
  user: UserData
): Promise<string> => {
  try {
    const response = await fetch(
      `${API_URL}/media/file?object_name=${encodeURIComponent(objectName)}&folder=${encodeURIComponent(folder)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `${user.tokenType} ${user.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file URL: ${response.statusText}`);
    }

    const data = await response.json();
    // Handle the response format: {"file":{"name":"filename.mp3","url":"https://...","folder":"folder/path"}}
    if (data.file && data.file.url) {
      return data.file.url;
    } else {
      throw new Error('File URL not found in response');
    }
  } catch (error) {
    console.error("Error fetching file URL:", error);
    throw error;
  }
};

/**
 * Get an audio preview URL from task set input metadata
 * @param inputMetadata The input metadata from a task set
 * @param user The authenticated user data
 * @returns The audio preview URL or null if no audio file info is available
 */
export const getAudioPreviewUrl = async (
  inputMetadata: any,
  user: UserData
): Promise<string | null> => {
  try {
    if (!inputMetadata || !inputMetadata.object_name || !inputMetadata.folder) {
      return null;
    }

    return await getFileUrl(inputMetadata.object_name, inputMetadata.folder, user);
  } catch (error) {
    console.error("Error getting audio preview URL:", error);
    return null;
  }
};

/**
 * Upload an audio file to the server
 * @param audioBlob The audio blob to upload
 * @param user The authenticated user data
 * @param folder Optional folder to store the file in (default: 'recordings')
 * @returns Object containing object_name and folder for the uploaded file
 */

export const uploadAudioFile = async (
  audioBlob: Blob,
  user: UserData,
  folder: string = 'recordings'
): Promise<FileUploadResponse> => {
  if (!user) throw new Error('User not authenticated');

  try {
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([bytes]), 'recording.wav');
    formData.append('folder', folder);

    // Upload the file
    const response = await fetch(`${API_URL}/media/file`, {
      method: 'POST',
      headers: {
        'Authorization': `${user.tokenType} ${user.token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload audio: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('File upload response:', data);

    // Check if the response has a nested 'file' object
    if (data.file) {
      console.log('File upload response has nested file object:', data.file);
      return {
        object_name: data.file.object_name,
        folder: data.file.folder,
        url: data.file.url,
        content_type: data.file.content_type,
        size_bytes: data.file.size_bytes
      };
    } else {
      // Handle the case where the response is flat
      console.log('File upload response is flat:', data);
      return {
        object_name: data.object_name,
        folder: data.folder,
        url: data.url,
        content_type: data.content_type,
        size_bytes: data.size_bytes
      };
    }
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};


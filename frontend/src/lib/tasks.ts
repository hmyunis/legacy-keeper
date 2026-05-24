import axiosClient from "../services/axiosClient";

export interface TaskResponse {
  task_id: string;
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'CANCELLED';
  progress: number;
  stage?: string | null;
  result: any;
  error: string | null;
}

export const getTaskStatus = async (taskId: string): Promise<TaskResponse> => {
  const response = await axiosClient.get<TaskResponse>(`/tasks/${taskId}/`);
  return response.data;
};

export const cancelTask = async (taskId: string): Promise<TaskResponse> => {
  const response = await axiosClient.post<TaskResponse>(`/tasks/${taskId}/cancel/`);
  return response.data;
};

export const pollTask = async (taskId: string, interval = 2000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const data = await getTaskStatus(taskId);

        if (data.status === 'READY') {
          resolve(data.result);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          reject(new Error(data.error || 'Task failed'));
        } else {
          setTimeout(checkStatus, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    void checkStatus();
  });
};

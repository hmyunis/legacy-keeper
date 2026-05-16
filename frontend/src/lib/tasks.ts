import axiosClient from "../services/axiosClient";

export interface TaskResponse {
  task_id: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  progress: number;
  result: any;
  error: string | null;
}

export const pollTask = async (taskId: string, interval = 2000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const response = await axiosClient.get<TaskResponse>(`/tasks/${taskId}/`);
        const data = response.data;

        if (data.status === 'READY') {
          resolve(data.result);
        } else if (data.status === 'FAILED') {
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
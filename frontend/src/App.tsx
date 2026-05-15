import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { Toaster } from 'sileo';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        options={{
          fill: "#141211",
          roundness: 12,
          styles: {
            title: "text-[#F7F4EF]! font-bold! tracking-wider! uppercase! text-[11px]!",
            description: "text-[#C2BAAB]! text-[10px]!",
            badge: "bg-[#B88F5B]/20!",
            button: "bg-[#B88F5B]! text-black! font-bold!",
          },
        }}
      />
    </QueryClientProvider>
  );
}

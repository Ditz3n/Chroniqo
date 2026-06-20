// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

// Export the GET and POST handlers required by Next.js App Router to process Auth.js requests
export const { GET, POST } = handlers;

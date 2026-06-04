import { type NextRequest } from "next/server";
import { handlePublicOrder } from "@/lib/public-enquiry-api";

export async function POST(request: NextRequest) {
  return handlePublicOrder(request);
}

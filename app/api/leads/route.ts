import { type NextRequest } from "next/server";
import { handlePublicEnquiry } from "@/lib/public-enquiry-api";

export async function POST(request: NextRequest) {
  return handlePublicEnquiry(request);
}

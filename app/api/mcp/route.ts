import { handleMcpRequest } from "@/app/lib/mcp/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleMcpRequest;

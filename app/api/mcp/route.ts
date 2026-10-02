import { handleMcpRequest } from "@/app/lib/mcp/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;

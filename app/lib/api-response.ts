import { NextResponse } from "next/server";

const privateResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

export function success(data: any, message?: string, status = 200) {
  return NextResponse.json(
    { success: true, data, message },
    { status, headers: privateResponseHeaders }
  );
}

export function failure(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers: privateResponseHeaders }
  );
}

import { NextResponse } from "next/server";

export function success(data: any, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

export function failure(
  message: string,
  status = 400,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("pitch.hashpay.tech") && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/pitch.html";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};

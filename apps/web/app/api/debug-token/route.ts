import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.NEXT_PUBLIC_DEMO_TOKEN || "not found";
  const hex = Array.from(token).map(c => c.charCodeAt(0).toString(16)).join(" ");
  return NextResponse.json({ token, hex, length: token.length });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserData, isPlaceholderFinancialData } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userData = await getUserData(user.id);

  if (!userData) {
    return NextResponse.json({ needsSetup: true }, { status: 200 });
  }

  // Check if financial data is missing or is placeholder data
  if (!userData.financial || isPlaceholderFinancialData(userData.financial)) {
    return NextResponse.json({ needsSetup: true }, { status: 200 });
  }

  return NextResponse.json({ needsSetup: false, data: userData.financial });
}


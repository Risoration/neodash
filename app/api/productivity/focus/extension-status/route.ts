import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserConfig, generateExtensionApiKey } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getUserConfig(user.id);
  const apiKey = config?.preferences?.extensionApiKey;

  // For now, we'll assume extension is connected if API key exists
  // In a real implementation, you'd ping the extension or have it register itself
  return NextResponse.json({
    connected: !!apiKey,
    apiKey: apiKey || null,
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKey = generateExtensionApiKey(user.id);
    return NextResponse.json({ apiKey, message: "API key generated" });
  } catch (error) {
    console.error("Error generating API key:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }
}


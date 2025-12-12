import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserConfig, updateUserConfig, getUserData, updateUserDataSection, WeatherData } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getUserConfig(user.id);
  return NextResponse.json({
    preferences: config?.preferences || {
      blockedSites: [],
    },
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { blockedSites } = body;

    if (blockedSites !== undefined && !Array.isArray(blockedSites)) {
      return NextResponse.json(
        { error: "blockedSites must be an array" },
        { status: 400 }
      );
    }

    const currentConfig = await getUserConfig(user.id);
    await updateUserConfig(user.id, {
      preferences: {
        ...currentConfig?.preferences,
        blockedSites: blockedSites !== undefined ? blockedSites : currentConfig?.preferences?.blockedSites || [],
      },
    });

    return NextResponse.json({ message: "Preferences updated" });
  } catch (error) {
    console.error("Preferences update error", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}


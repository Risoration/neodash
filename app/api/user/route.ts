import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, updateUserData, getUserData } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullUser = getUserById(user.id);
  if (!fullUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: fullUser.id,
    email: fullUser.email,
    name: fullUser.name,
    createdAt: fullUser.createdAt,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, data } = body;

    // Update user profile
    if (name) {
      // This would require updating the db.ts to support updating user name
      // For now, we'll just update user data
    }

    // Update user data (crypto, productivity, weather)
    if (data) {
      updateUserData(user.id, data);
    }

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}


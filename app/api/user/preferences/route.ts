import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserConfig, updateUserConfig, getUserData, updateUserDataSection, WeatherData } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getUserConfig(user.id);
  return NextResponse.json({
    preferences: config?.preferences || {
      temperatureUnit: "fahrenheit",
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
    const { temperatureUnit, blockedSites } = body;

    if (temperatureUnit && !["fahrenheit", "celsius"].includes(temperatureUnit)) {
      return NextResponse.json(
        { error: "Invalid temperature unit" },
        { status: 400 }
      );
    }

    if (blockedSites !== undefined && !Array.isArray(blockedSites)) {
      return NextResponse.json(
        { error: "blockedSites must be an array" },
        { status: 400 }
      );
    }

    const currentConfig = getUserConfig(user.id);
    updateUserConfig(user.id, {
      preferences: {
        ...currentConfig?.preferences,
        temperatureUnit: temperatureUnit || currentConfig?.preferences?.temperatureUnit || "fahrenheit",
        blockedSites: blockedSites !== undefined ? blockedSites : currentConfig?.preferences?.blockedSites || [],
      },
    });

    // If user has weather data, refresh it with the new unit
    const userData = getUserData(user.id);
    if (userData?.weather?.location) {
      // Trigger weather data refresh by calling the setup endpoint
      // This will re-fetch weather with the new unit preference
      try {
        const weatherResponse = await fetch(
          `https://wttr.in/${encodeURIComponent(userData.weather.location)}?format=j1`,
          { next: { revalidate: 0 } }
        );
        const weatherData = await weatherResponse.json();
        
        if (weatherData?.current_condition?.[0]) {
          const current = weatherData.current_condition[0];
          const daily = weatherData.weather?.slice(0, 5) ?? [];
          
          const convertTemp = (value: string) =>
            temperatureUnit === "fahrenheit"
              ? Number(value)
              : Math.round(((Number(value) - 32) * 5) / 9);

          const forecast = daily.map((day: any) => ({
            day: new Date(day.date).toLocaleDateString(undefined, {
              weekday: "short",
            }),
            high: convertTemp(day.maxtempF),
            low: convertTemp(day.mintempF),
            condition: day.hourly?.[4]?.weatherDesc?.[0]?.value ?? "—",
          }));

          const hourly = (daily[0]?.hourly ?? []).map((slot: any, index: number) => ({
            hour: index * 3,
            temp: convertTemp(slot.tempF),
            condition: slot.weatherDesc?.[0]?.value ?? "—",
          }));

          updateUserDataSection(user.id, "weather", {
            location: userData.weather.location,
            temperature: convertTemp(current.temp_F),
            condition: current.weatherDesc?.[0]?.value ?? "—",
            humidity: Number(current.humidity ?? 0),
            windSpeed: Number(current.windspeedMiles ?? 0),
            forecast,
            hourly: hourly.slice(0, 8),
          });
        }
      } catch (error) {
        console.error("Error refreshing weather data:", error);
        // Don't fail the request if weather refresh fails
      }
    }

    return NextResponse.json({ message: "Preferences updated" });
  } catch (error) {
    console.error("Preferences update error", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}


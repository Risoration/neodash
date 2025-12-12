'use server';

export async function getWeatherData() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weather`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) throw new Error('Failed to fetch weather');
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

export async function getCryptoData() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) throw new Error('Failed to fetch crypto');
    return await response.json();
  } catch (error) {
    console.error('Error fetching crypto:', error);
    return null;
  }
}

export async function getProductivityData() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/productivity`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) throw new Error('Failed to fetch productivity');
    return await response.json();
  } catch (error) {
    console.error('Error fetching productivity:', error);
    return null;
  }
}

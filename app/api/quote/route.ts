import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "A projektindítás bejelentkezéshez kötött. Nyisd meg az ügyfélkaput."
    },
    { status: 410 }
  );
}

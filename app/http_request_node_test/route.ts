import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

const ITEMS = [
  {
    id: 1,
    title: "Hagia Sophia",
    lng: 28.98,
    lat: 41.0086,
    color: "#e63946",
  },
  {
    id: 2,
    title: "Galata Tower",
    lng: 28.9744,
    lat: 41.0256,
    color: "#4361ee",
  },
  {
    id: 3,
    title: "Maiden's Tower",
    lng: 29.0044,
    lat: 41.0211,
    color: "#f4a259",
  },
  {
    id: 4,
    title: "Topkapi Palace",
    lng: 28.9834,
    lat: 41.0115,
    color: "#06d6a0",
  },
  {
    id: 5,
    title: "Grand Bazaar",
    lng: 28.9706,
    lat: 41.0106,
    color: "#9b8cff",
  },
];

export function GET() {
  return NextResponse.json(
    { items: ITEMS },
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

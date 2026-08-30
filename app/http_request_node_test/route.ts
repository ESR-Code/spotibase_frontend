import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

// Usage: http://localhost:3000/http_request_node_test

const ITEMS = [
  {
    id: 1,
    title: "Hagia Sophia",
    lng: 28.98,
    lat: 41.0086,
    color: "#e63946",
    image:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80",
    description:
      "The Hagia Sophia is a historic church in Istanbul, Turkey. It was built in the 6th century and was once the largest church in the world. It is now a museum.",
    builtIn: 1453,
  },
  {
    id: 2,
    title: "Galata Tower",
    lng: 28.9744,
    lat: 41.0256,
    color: "#4361ee",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
    description:
      "The Galata Tower is a historic tower in Istanbul, Turkey. It was built in the 13th century and was once the tallest building in the world. It is now a museum.",
    builtIn: 1348,
  },
  {
    id: 3,
    title: "Maiden's Tower",
    lng: 29.0044,
    lat: 41.0211,
    color: "#f4a259",
    image:
      "https://images.unsplash.com/photo-1604482688162-5d4f8f7e9a5a?auto=format&fit=crop&w=800&q=80",
    description:
      "The Maiden's Tower is a historic tower in Istanbul, Turkey. It was built in the 13th century and was once the tallest building in the world. It is now a museum.",
    builtIn: 1207,
  },
  {
    id: 4,
    title: "Topkapi Palace",
    lng: 28.9834,
    lat: 41.0115,
    color: "#06d6a0",
    image:
      "https://images.unsplash.com/photo-1604156784954-6e1a7a3f3e9a?auto=format&fit=crop&w=800&q=80",
    description:
      "The Topkapi Palace is a historic palace in Istanbul, Turkey. It was built in the 13th century and was once the tallest building in the world. It is now a museum.",
    builtIn: 1453,
  },
  {
    id: 5,
    title: "Grand Bazaar",
    lng: 28.9706,
    lat: 41.0106,
    color: "#9b8cff",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
    description:
      "The Grand Bazaar is a historic market in Istanbul, Turkey. It was built in the 13th century and was once the tallest building in the world. It is now a museum.",
    builtIn: 1453,
  },
];


export function GET() {
  return NextResponse.json(
    ITEMS,
    { headers: CORS_HEADERS },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

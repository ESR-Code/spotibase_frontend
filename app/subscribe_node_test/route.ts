import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

// Usage: http://localhost:3000/subscribe_node_test
// Optional: ?includeFerry=0  (keep the landmark count fixed)

/**
 * How to test

Open Scene Actions → Scene Start.
Add Subscribe, URL /subscribe_node_test (or http://localhost:3000/subscribe_node_test), interval 2.
Click Test on the node — you should see JSON without a timer starting.
Connect For Each (items path $ or leave empty for the root array).
Connect Spawn Hotspot, lat/lon from {{lat}} / {{lng}}, replace on rerun on, title {{title}}.
Enter Preview on a geo scene: pins should appear, drift, change color with status, and the ferry should appear/disappear. Exit Preview: polling stops.
 */

const STATUSES = ["ok", "warn", "alarm"] as const;

const STATUS_COLORS: Record<(typeof STATUSES)[number], string> = {
  ok: "#06d6a0",
  warn: "#f4a259",
  alarm: "#e63946",
};

const LANDMARKS = [
  {
    id: 1,
    title: "Hagia Sophia",
    lng: 28.9802,
    lat: 41.0086,
    image:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80",
    description:
      "Hagia Sophia is one of Istanbul's most important historic landmarks. The present building was commissioned by Byzantine Emperor Justinian I and constructed between 532 and 537. It served as an Eastern Roman imperial church, later became a mosque after the Ottoman conquest of Constantinople in 1453, and was subsequently used as a museum before returning to mosque status in 2020.",
    builtIn: 537,
  },
  {
    id: 2,
    title: "Galata Tower",
    lng: 28.9744,
    lat: 41.0256,
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description:
      "Galata Tower is a medieval stone tower in Istanbul's Beyoğlu district. The tower that stands today was built by the Genoese in 1348 as part of the fortifications of their colony. Over the centuries it served various purposes, including a watchtower, prison, and fire lookout. Today it is a museum and observation point with panoramic views of Istanbul.",
    builtIn: 1348,
  },
  {
    id: 3,
    title: "Maiden's Tower",
    lng: 29.0044,
    lat: 41.0211,
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description:
      "Maiden's Tower stands on a small islet in the Bosphorus near Üsküdar. The site has been used for centuries, and a defensive tower was established there during the Byzantine period. Because of earthquakes, fires, and weather, the structure has been rebuilt and renovated many times. Much of the structure visible today dates from the reign of Sultan Mahmud II in 1832–1833. It has served as a defense post, lighthouse, quarantine station, and observation station.",
    builtIn: 1833,
  },
  {
    id: 4,
    title: "Topkapı Palace",
    lng: 28.9834,
    lat: 41.0115,
    image:
      "https://images.unsplash.com/photo-1589561454226-796a8aa89b05?auto=format&fit=crop&w=1200&q=80",
    description:
      "Topkapı Palace was commissioned by Sultan Mehmed II after the Ottoman conquest of Constantinople. Construction of the New Palace began in the 15th century and the complex was expanded by successive sultans over several centuries. It served as the principal residence and administrative center of the Ottoman sultans for roughly four centuries. Today it is a museum and forms part of the Historic Areas of Istanbul, a UNESCO World Heritage Site.",
    builtIn: 1460,
  },
  {
    id: 5,
    title: "Grand Bazaar",
    lng: 28.9706,
    lat: 41.0106,
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    description:
      "The Grand Bazaar, known in Turkish as Kapalıçarşı, is one of the world's oldest and largest covered markets. Its foundation is traditionally dated to 1461, shortly after Sultan Mehmed II's conquest of Constantinople. The market expanded over the centuries into a large network of covered streets and shops and became one of Istanbul's major centers of commerce.",
    builtIn: 1461,
  },
];

const FERRY = {
  id: 6,
  title: "Bosphorus Ferry",
  lng: 29.008,
  lat: 41.04,
  image:
    "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
  description:
    "A live ferry crossing the Bosphorus. Appears and disappears on a cycle so Spawn Hotspot replace-on-rerun can be verified.",
  builtIn: 2026,
};

let requestCount = 0;

function liveItem(
  base: (typeof LANDMARKS)[number] | typeof FERRY,
  tick: number,
) {
  const status = STATUSES[(tick + base.id) % STATUSES.length];
  const lng = base.lng + Math.sin(tick * 0.4 + base.id) * 0.002;
  const lat = base.lat + Math.cos(tick * 0.35 + base.id) * 0.0015;
  return {
    ...base,
    tick,
    status,
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
    color: STATUS_COLORS[status],
  };
}

export function GET(request: Request) {
  requestCount += 1;
  const tick = requestCount;
  const includeFerry =
    new URL(request.url).searchParams.get("includeFerry") !== "0";
  const ferryVisible = includeFerry && tick % 6 < 4;

  const items = LANDMARKS.map((item) => liveItem(item, tick));
  if (ferryVisible) items.push(liveItem(FERRY, tick));

  return NextResponse.json(items, { headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const APP_ID = "SL8MWRF5XP.com.MAL.tash";

const canonicalSharePaths = [
  "/",
  "/profile/*",
  "/work/*",
  "/artist/*",
  "/list/*",
  "/post/*",
];

const appOpenPaths = ["/open-app/*"];

function resolveHost(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  return host.split(",")[0]?.trim().toLowerCase().split(":")[0] || "";
}

export async function GET(request: Request) {
  const host = resolveHost(request);
  const paths =
    host === "open.tash.kr"
      ? appOpenPaths
      : host === "link.tash.kr"
        ? canonicalSharePaths
        : [];

  const data = {
    applinks: {
      apps: [],
      details: [
        {
          appID: APP_ID,
          paths,
        },
      ],
    },
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

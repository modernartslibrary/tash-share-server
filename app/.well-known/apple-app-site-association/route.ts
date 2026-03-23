export async function GET() {
  const data = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "SL8MWRF5XP.com.MAL.tash",
          paths: ["/work/*", "/post/*", "/artist/*", "/list/*", "/profile/*"],
        },
      ],
    },
  };
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const data = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.MAL.tash",
        sha256_cert_fingerprints: [
        "32:26:E4:7F:EA:5E:6F:E4:6C:1E:92:90:9E:9D:F2:33:51:9E:AA:3C:35:5F:F7:6D:84:D7:FE:0A:56:1F:EF:D4",
      ],
      },
    },
  ];
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

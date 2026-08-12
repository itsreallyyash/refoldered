export async function POST(req) {
  const { code } = await req.json();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = "https://refoldered.com/callback";

  if (!clientId || !clientSecret) {
    return Response.json({ error: "Missing Spotify credentials" }, { status: 500 });
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const data = await response.json();

    if (data.access_token) {
      return Response.json({
        access_token: data.access_token,
        expires_in: data.expires_in,
      });
    } else {
      return Response.json({ error: "Failed to get access token" }, { status: 400 });
    }
  } catch (err) {
    console.error("Spotify token error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

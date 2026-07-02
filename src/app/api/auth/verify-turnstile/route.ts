export async function POST(req: Request) {
  let token: string | undefined;

  try {
    const body = await req.json();
    token = body?.token;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!token) {
    return Response.json({ error: "Missing verification token." }, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for");

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });

    if (!res.ok) {
      // Cloudflare's endpoint itself errored (rare, but don't trust the body then)
      console.error("Turnstile siteverify HTTP error:", res.status);
      return Response.json({ error: "Verification service unavailable." }, { status: 502 });
    }

    const data = await res.json();

    if (!data.success) {
      console.warn("Turnstile verification failed:", data["error-codes"]);
      return Response.json({ error: "Bot check failed." }, { status: 403 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return Response.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
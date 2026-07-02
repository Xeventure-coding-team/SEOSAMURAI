export async function checkEmailReputation(email: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const res = await fetch(
    `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`
  );
  const data = await res.json();

  if (data.is_disposable_email?.value) {
    return { valid: false, reason: "Disposable email addresses are not allowed." };
  }
  if (!data.is_mx_found?.value) {
    return { valid: false, reason: "This email domain does not accept mail." };
  }
  if (data.deliverability === "UNDELIVERABLE") {
    return { valid: false, reason: "This email address appears to be invalid." };
  }

  return { valid: true };
}
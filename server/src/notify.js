// Lightweight owner notifications. Use any one: Telegram, Discord, or Slack webhook.
// Node 18+ has global fetch.
function formatOrderText(order) {
  const items = order.items
    .map((i) => `• ${i.name} x${i.qty} — $${Number(i.price).toFixed(2)}`)
    .join("\n");
  return [
    `New order: ${order.id}`,
    `Name: ${order.name}`,
    `Phone: ${order.phone}`,
    `Location: ${order.location}`,
    `Doctor recommended: ${order.doctorRecommended ? "Yes" : "No"}`,
    `Total: $${Number(order.total).toFixed(2)}`,
    `Items:\n${items}`,
    `Created: ${new Date(order.createdAt).toLocaleString()}`,
  ].join("\n");
}

async function notifyTelegram(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const text = formatOrderText(order);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function notifyDiscord(order) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const content = "```" + formatOrderText(order) + "```";
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

async function notifySlack(order) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = formatOrderText(order);
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function notifyOwner(order) {
  try {
    await Promise.allSettled([
      notifyTelegram(order),
      notifyDiscord(order),
      notifySlack(order),
    ]);
  } catch {
    // ignore errors from notification integrations
  }
}

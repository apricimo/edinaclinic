const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

let client;
const cache = new Map();

async function getSecretString({ envKeyName, secretNameEnv }) {
  const envKeys = toArray(envKeyName);
  for (const key of envKeys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const secretEnvKeys = toArray(secretNameEnv);
  const secretId = secretEnvKeys
    .map((key) => (key ? process.env[key] : undefined))
    .find((val) => typeof val === "string" && val.trim());

  if (!secretId) {
    throw new Error("Secret identifier is not configured");
  }

  const cacheHit = cache.get(secretId);
  if (cacheHit) return cacheHit;

  if (!client) {
    client = new SecretsManagerClient({});
  }

  const command = new GetSecretValueCommand({ SecretId: secretId });
  const result = await client.send(command);

  let secretString = result.SecretString;
  if (!secretString && result.SecretBinary) {
    secretString = Buffer.from(result.SecretBinary, "base64").toString("utf8");
  }

  if (!secretString) {
    throw new Error("Secret payload empty");
  }

  let secret = secretString.trim();
  try {
    const parsed = JSON.parse(secret);
    if (parsed && typeof parsed === "object") {
      secret = parsed.apiKey || parsed.secretKey || parsed.STRIPE_API_KEY || parsed.value || secret;
    }
  } catch (err) {
    // Plain text secret
  }

  if (typeof secret !== "string") {
    throw new Error("Secret resolved to non-string value");
  }

  secret = secret.trim();
  if (!secret) {
    throw new Error("Secret resolved empty");
  }

  cache.set(secretId, secret);
  return secret;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

module.exports = {
  getSecretString
};

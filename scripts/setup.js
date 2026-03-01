#!/usr/bin/env node
/* eslint-disable */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log("\n  Datrics Setup\n  ─────────────────────────\n");

  // Step 1: Create .env if missing
  if (!fs.existsSync(ENV_PATH)) {
    if (!fs.existsSync(ENV_EXAMPLE)) {
      console.error("  Error: .env.example not found. Are you in the project root?");
      process.exit(1);
    }
    fs.copyFileSync(ENV_EXAMPLE, ENV_PATH);
    console.log("  Created .env from .env.example");
  } else {
    console.log("  .env already exists, updating placeholders...");
  }

  let content = fs.readFileSync(ENV_PATH, "utf-8");

  // Step 2: Generate AUTH_SECRET if placeholder
  if (content.includes("generate-a-secret-with-openssl-rand-base64-32")) {
    const secret = crypto.randomBytes(32).toString("base64");
    content = content.replace(
      "generate-a-secret-with-openssl-rand-base64-32",
      secret
    );
    console.log("  Generated AUTH_SECRET");
  } else {
    console.log("  AUTH_SECRET already set");
  }

  // Step 3: Generate ENCRYPTION_KEY if placeholder
  if (content.includes("generate-a-64-char-hex-key")) {
    const key = crypto.randomBytes(32).toString("hex");
    content = content.replace("generate-a-64-char-hex-key", key);
    console.log("  Generated ENCRYPTION_KEY");
  } else {
    console.log("  ENCRYPTION_KEY already set");
  }

  // Step 4: Prompt for ADMIN_EMAIL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const email = await ask(rl, "  Admin email [admin@example.com]: ");
  rl.close();

  if (email && email !== "admin@example.com") {
    content = content.replace(
      /ADMIN_EMAIL="[^"]*"/,
      `ADMIN_EMAIL="${email}"`
    );
    console.log(`  Set ADMIN_EMAIL to ${email}`);
  } else {
    console.log("  Using default ADMIN_EMAIL (admin@example.com)");
  }

  // Step 5: Write .env
  fs.writeFileSync(ENV_PATH, content);
  console.log("  Saved .env\n");

  // Step 6: Initialize database
  console.log("  Initializing database...\n");
  try {
    execSync("npx prisma db push", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.error("\n  Error: Failed to initialize database.");
    console.error("  Make sure you have Node.js and npm installed correctly.");
    process.exit(1);
  }

  // Success
  console.log("\n  ─────────────────────────");
  console.log("  Setup complete!\n");
  console.log("  Next steps:");
  console.log("    1. npm run dev");
  console.log("    2. Open http://localhost:3000");
  console.log("    3. Sign up — the first user becomes admin automatically");
  console.log("    4. Connect your first database from the onboarding wizard\n");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});

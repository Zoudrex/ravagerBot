import dotenv from "dotenv";

dotenv.config();

const {DISCORD_TOKEN, DISCORD_CLIENT_ID, SERVER_ID, INVITE_REMINDER_CHANNEL_NAME, SERVER_RVG_ID, SERVER_UFG_ID, RAIDER_ROLE_NAME} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error("Missing environment variables");
}

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    SERVER_ID,
    INVITE_REMINDER_CHANNEL_NAME,
    SERVER_RVG_ID,
    SERVER_UFG_ID,
    RAIDER_ROLE_NAME
};
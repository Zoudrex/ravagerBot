import dotenv from "dotenv";

dotenv.config();

const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    SERVER_ID,
    INVITE_REMINDER_CHANNEL_NAME,
    RAIDER_ROLE_NAME,
    APPLICANT_ROLE_NAME,
    WOWAUDIT_API_KEY
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !SERVER_ID) {
    throw new Error("Missing environment variables");
}

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    SERVER_ID,
    INVITE_REMINDER_CHANNEL_NAME,
    RAIDER_ROLE_NAME,
    APPLICANT_ROLE_NAME,
    WOWAUDIT_API_KEY
};

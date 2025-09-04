module.exports = {
    apps: [
        {
            name: "discord-bot",
            script: "npx",
            args: "dotenv -e .env -- tsx src/bot.ts",
            cwd: __dirname, // ensure it runs from project root
        },
    ],
};

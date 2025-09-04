module.exports = {
    apps: [
        {
            name: "discord-bot",
            script: "dist/bot.js",
            cwd: __dirname,
            watch: false,
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
module.exports = {
    apps: [
        {
            name: "RAVAGER bot",
            script: "npm",
            args: "run start",
            cwd: __dirname, // ensure it runs from project root
        },
    ],
};

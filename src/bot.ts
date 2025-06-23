import {ButtonInteraction, Client, Guild} from "discord.js";
import {config} from "./config";
import {commands} from "./commands";
import {deployCommands} from "./commands/deploy-commands";
import {buttonInteractions} from "./buttonInteractions";
import Scheduler from "./schedulers/scheduler";

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
});

const scheduler = new Scheduler();

client.once("ready", async () => {
    scheduler.start();
    await refreshBotCommands();
    console.log("Discord bot is ready! 🤖");
});

client.on("guildCreate", async (guild) => {
    await deployCommands({guildId: guild.id});
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        // Handle command interactions
        const {commandName} = interaction;
        if (commands[commandName as keyof typeof commands]) {
            await commands[commandName as keyof typeof commands].execute(interaction);
        }
    } else if (interaction.isButton()) {
        // Handle button interactions
        const buttonInteraction = interaction as ButtonInteraction;
        let customId = buttonInteraction.customId
        const additionalRoles: string[] = [];

        if(buttonInteraction.customId === "createRaidTicket") {
            customId = "createTicket";
            additionalRoles.push("Raid Assist")
        }

        if (buttonInteractions[customId as keyof typeof buttonInteractions]) {
            await buttonInteractions[customId as keyof typeof buttonInteractions].execute(buttonInteraction, additionalRoles);
        }
    }
});

client.login(config.DISCORD_TOKEN);
async function refreshBotCommands() {
    for (const guild of client.guilds.cache) {
        await deployCommands({guildId: guild[0]});
    }
}
let botVars = {client: client, scheduler: scheduler};
export default botVars
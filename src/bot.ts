import {ButtonInteraction, Client, Guild} from "discord.js";
import {config} from "./config";
import {commands} from "./commands";
import {deployCommands} from "./commands/deploy-commands";
import {buttonInteractions} from "./buttonInteractions";
import Scheduler from "./schedulers/scheduler";

const client = new Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages", "GuildMembers"],
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
    if (interaction.isChatInputCommand()) {
        // Handle command interactions
        const {commandName} = interaction;
        if (commands[commandName as keyof typeof commands]) {
            await commands[commandName as keyof typeof commands].execute(interaction);
        }
    } else if (interaction.isButton()) {
        // Handle button interactions
        const buttonInteraction = interaction as ButtonInteraction;
        let customId = buttonInteraction.customId

        if (buttonInteraction.customId === "createApplyTicket") {
            customId = "createTicket";
        }

        if (buttonInteractions[customId as keyof typeof buttonInteractions]) {
            await buttonInteractions[customId as keyof typeof buttonInteractions].execute(buttonInteraction);
        }
    }
});

client.on("guildMemberAdd", async (member) => {
    if (!config.SERVER_UFG_ID || !config.SERVER_RVG_ID) {
        return;
    }
    if (member.guild.id === config.SERVER_UFG_ID) {
        return;
    }

    const ufg = client.guilds.cache.get(config.SERVER_UFG_ID);
    const rvg = client.guilds.cache.get(config.SERVER_RVG_ID);

    if (!ufg || !rvg) {
        console.log("Couldn't find the required servers");
        return;
    }

    await ufg.members.fetch();
    let ufgMember = ufg.members.cache.get(member.id);
    let hasRole = ufgMember?.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
    let rvgRaiderRole = rvg.roles.cache.find(role => role.name === config.RAIDER_ROLE_NAME);
    let rvgApplicantRole = rvg.roles.cache.find(role => role.name === config.APPLICANT_ROLE_NAME);

    if (!rvgApplicantRole) {
        console.log('Applicant role doesnt exist');
        return;
    }

    if (!ufgMember || !hasRole) {
        await member.roles.add(rvgApplicantRole);
        return;
    }


    if (!hasRole || !rvgRaiderRole) {
        console.log("Couldn't find the required roles");
        return;
    }
    await member.roles.add(rvgRaiderRole);
})

client.login(config.DISCORD_TOKEN);

async function refreshBotCommands() {
    for (const guild of client.guilds.cache) {
        await deployCommands({guildId: guild[0]});
    }
}

let botVars = {client: client, scheduler: scheduler};
export default botVars
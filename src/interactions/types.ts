import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export type SlashCommand = {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
};

export type ButtonInteractionHandler = {
    execute(interaction: ButtonInteraction): Promise<unknown>;
};

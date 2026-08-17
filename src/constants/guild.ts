export const ROLE_NAMES = {
    gm: "GM",
    assistantGm: "Assistant GM",
    officer: "Officer",
    officers: "Officers",
    recruitment: "Recruitment",
    social: "Social",
} as const;

export const STAFF_ROLES: readonly string[] = [
    ROLE_NAMES.gm,
    ROLE_NAMES.assistantGm,
    ROLE_NAMES.officer,
    ROLE_NAMES.officers,
];

export const RECRUITMENT_ROLES: readonly string[] = [
    ROLE_NAMES.gm,
    ROLE_NAMES.assistantGm,
    ROLE_NAMES.recruitment,
];

export const CHANNEL_NAMES = {
    tickets: "ꓔickets",
    apply: "ꓮpply",
} as const;

export const CATEGORY_NAMES = {
    tickets: "Tickets",
    applicants: "ꓮpplicants",
    ticketArchive: "ticket-archive",
} as const;

export const BUTTON_IDS = {
    createTicket: "createTicket",
    createApplyTicket: "createApplyTicket",
    archiveTicket: "archiveTicket",
} as const;

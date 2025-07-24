import * as ping from "./ping";
import * as deploy from "./deployChannels"
import * as cancelraid from "./cancelRaid"
import * as nextraid from "./nextRaid"
import * as handleapplicant from "./applicants/handleApplicant"


export const commands = {
    ping,
    deploy,
    cancelraid,
    nextraid,
    handleapplicant
};
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "process job queue",
    { seconds: 30 },
    internal.ai.processJobQueue,
);

export default crons;

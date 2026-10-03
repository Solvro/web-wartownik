export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { runStartupTasks } = await import("@wartownik/api/startup");
    await runStartupTasks();
  }
}

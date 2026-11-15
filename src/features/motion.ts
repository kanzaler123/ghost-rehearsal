export const motionDuration = (reduced: boolean, ms: number): number => reduced ? 0 : ms;
export const autoplayAfterRun = (reduced: boolean): boolean => !reduced;

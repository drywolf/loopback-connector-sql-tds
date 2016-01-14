
export const DEBUG_ID:string = 'loopback:connector:sql-tds';

export enum DebugFlags
{
    General = 1 << 0,
    Pool = 1 << 1,
    TDSInfo = 1 << 2,
    TDSError = 1 << 3,
    TDSDebug = 1 << 4,
    SQL = 1 << 5,
}

export function hasFlag(val: number, flag: number): boolean
{
    return (val & flag) !== 0;
}


export function debugOption(options: any, flag: DebugFlags): boolean
{
    if (!options)
        return false;
        
    return hasFlag(options.debug_flags, flag);
}

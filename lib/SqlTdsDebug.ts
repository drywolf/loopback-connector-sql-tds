
export const DEBUG_ID:string = 'loopback:connector:sql-tds';

export const DebugFlags =
{
    General: 1 << 0,
    Pool: 1 << 1,
    TDSInfo: 1 << 2,
    TDSError: 1 << 3,
    TDSDebug:1 << 4,
    SQL: 1 << 5,
}

export function debugOption(options: any, flag: number): boolean
{
    if (!options)
        return false;
    
    return ((options.debug_flags & flag) !== 0);
}

import { SqlTdsConnector } from './SqlTdsConnector';

export class SqlQueryBuilder
{
    public static buildLimit(model: string, limit: number, offset: number) 
    {
        if (isNaN(limit))
        {
            limit = 0;
        }
        
        if (isNaN(offset))
        {
            offset = 0;
        }
        
        if (!limit && !offset)
        {
            return '';
        }
        
        return 'LIMIT ' + (offset ? (offset + ',' + limit) : limit);
    }
    
    private static fillZeros(v: number): string
    {
        return v < 10 ? '0' + v : v.toString();
    }
    
    public static jsDateToMsSqlDate(val:Date)
    {
        // TODO: this vs SqlQueryBuilder
        var dateStr = val.getUTCFullYear() + '-'
            + this.fillZeros(val.getUTCMonth() + 1) + '-'
            + this.fillZeros(val.getUTCDate())
            + 'T' + this.fillZeros(val.getUTCHours()) + ':' +
            this.fillZeros(val.getUTCMinutes()) + ':' +
            this.fillZeros(val.getUTCSeconds()) + '.';

        var ms = val.getUTCMilliseconds();
        var ms_str = ms.toString();
        
        if (ms < 10)
            ms_str = '00' + ms;
            
        else if (ms < 100)
            ms_str = '0' + ms;

        return dateStr + ms_str;
    }
    
    public static formatSqlParams(sql: string, params: any[], connector: SqlTdsConnector): string
    {
        if (Array.isArray(params))
        {
            var count = 0;
            var index = -1;
            
            while (count < params.length)
            {
                index = sql.indexOf('(?)');
                
                if (index === -1)
                    return sql;

                sql = sql.substring(0, index) + this.escape(params[count]) +
                
                    sql.substring(index + 3);
                count++;
            }
        }
        
        return sql;
    }
    
    public static escape(val): any
    {
        if (val === undefined || val === null)
            return 'NULL';

        switch (typeof val)
        {
            case 'boolean':
            return (val) ? 1 : 0;
            case 'number':
            return val + '';
        }

        if (typeof val === 'object')
        {
            val = (typeof val.toISOString === 'function')
            ? val.toISOString()
            : val.toString();
        }

        val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, (s) => 
        {
            switch (s) {
            case "\0":
                return "\\0";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\b":
                return "\\b";
            case "\t":
                return "\\t";
            case "\x1a":
                return "\\Z";
            case "\'":
                return "''";
            case "\"":
                return s;
            default:
                return "\\" + s;
            }
        });

        return "N'" + val + "'";
    }
}

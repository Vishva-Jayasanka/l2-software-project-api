const sql = require('mssql');
const config = {
    server: 'LAPTOP-T4KK4VD3',
    // server: 'vishwa.database.windows.net',
    instance: 'MSSQLSERVER',
    user: 'jayasanka',
    password: 'jayasanka',
    database: 'lmsdb',
    options: {
        encrypt: false,
        // encrypt: true,
    }
}

const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
    console.log('Successfully connected to the MS SQL Server!');
    return pool;
}).catch(error => {
    console.log('Error: ' + error);
});

module.exports = {
    sql, poolPromise
}

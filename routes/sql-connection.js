const sql = require('mssql');
const config = {
    server: 'LAPTOP-T4KK4VD3',
    instance: 'MSSQLSERVER',
    user: 'jayasanka',
    password: '123456',
    database: 'lmsdb',
    options: {
        encrypt: false,
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

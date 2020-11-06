const sql = require('mssql');
// const config = {
//     server: 'vishwa-jayasanka.database.windows.net',
//     instance: 'MSSQLSERVER',
//     user: 'vishwa',
//     password: 'Jayasanka1235',
//     database: 'lmsdb',
//     options: {
//         encrypt: true,
//     }
// }

const config = {
    server: 'localhost',
    instance: 'MSSQLSERVER',
    user: 'onali',
    password: '123456',
    database: 'lmsdb',
    options: {
        enableArithAbort: true,
        encrypt: false
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

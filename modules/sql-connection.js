const sql = require('mssql');

const config = {
    server: 'localhost',
    user: 'jayasanka',
    password: 'jayasanka',
    database: 'imsdb',
    options: {
        enableArithAbort: true,
        encrypt: true
    }
}
// mssqlserver.cb9qno8m1wma.ap-south-1.rds.amazonaws.com

const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
    console.log('Successfully connected to the MS SQL Server!');
    return pool;
}).catch(error => {
    console.log('Error: ' + error);
});

module.exports = {
    sql, poolPromise
}

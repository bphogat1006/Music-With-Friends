import { DB_ROOT_PASSWORD } from '$env/static/private';
import { createPool } from 'mariadb';
const pool = createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: DB_ROOT_PASSWORD,
    connectionLimit: 15,
    idleTimeout: 5,
    database: 'music_with_friends'
});
export async function query(query, log = false) {
    let conn;
    try {
        conn = await pool.getConnection();
        if (log) {
            console.log('CONNECTED to db, thread_id=' + conn.threadId)
            console.log('QUERY:')
            console.log(query.slice(0, 100)+' ...')
        }
        const res = await conn.query(query);
        if (log) {
            console.log('RESULT:')
            console.log(res)
        }
        return res;
    } catch (err) {
        if (log) {
            console.log('ERROR:');
            console.log(err);
        }
        throw err;
    } finally {
        if (log) console.log("RELEASING conn" + conn.threadId);
        if (conn) {
            conn.release()
        }
    }
}
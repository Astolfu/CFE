const mysql = require('mysql2/promise');

const passwords = ['', 'root', '1234', '123456', '12345678', 'admin', 'mysql', 'root123', 'admin123'];
const users = ['root'];

async function testConnections() {
    console.log('Starting MySQL credential probe...');
    for (const user of users) {
        for (const password of passwords) {
            try {
                console.log(`Trying ${user} with password: "${password}"...`);
                const connection = await mysql.createConnection({
                    host: 'localhost',
                    user: user,
                    password: password,
                    connectTimeout: 2000
                });
                console.log(`\n🎉 SUCCESS! Connected as user "${user}" with password "${password}"\n`);
                await connection.end();
                process.exit(0);
            } catch (err) {
                console.log(`Failed: ${err.message}`);
            }
        }
    }
    console.log('\n❌ Could not connect with any common credentials.');
    process.exit(1);
}

testConnections();

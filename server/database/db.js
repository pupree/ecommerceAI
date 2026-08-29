import pkg from 'pg';
const { Client } = pkg;


const database = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mern_ecommerce_store',
    password: process.env.DB_PASSWORD || 'Rodeladupur20',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
})

try{
    await database.connect();
    console.log('Database connected successfully');
    
}catch(error){
    console.error('Database connection failed', error);
    process.exit(1);
}

export default database;